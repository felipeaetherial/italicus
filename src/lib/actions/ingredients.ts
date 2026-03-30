"use server";

import { adminDb } from "@/lib/firebase/admin";
import { CreateIngredientSchema } from "@/lib/db/schemas";
import {
  type ActionResult,
  actionResponse,
  actionError,
  nowISO,
  tenantCollection,
} from "./db";
import { getAuthenticatedUser } from "./utils";
import { calculateSheetCost, calculateProfitMargin } from "./db";

export async function createIngredient(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = CreateIngredientSchema.safeParse(input);
    if (!parsed.success) {
      return actionError(parsed.error.issues.map((i) => i.message).join(", "));
    }

    const user = await getAuthenticatedUser();
    const col = tenantCollection(user.tenantId, "ingredients");
    const now = nowISO();

    const docRef = await col.add({
      ...parsed.data,
      createdAt: now,
      updatedAt: now,
    });

    return actionResponse({ id: docRef.id });
  } catch (error) {
    return actionError(
      error instanceof Error ? error.message : "Erro ao criar insumo",
    );
  }
}

export async function updateIngredient(
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getAuthenticatedUser();
    const col = tenantCollection(user.tenantId, "ingredients");
    const docRef = col.doc(id);

    // Fetch current ingredient to compare costPerUnit
    const currentSnap = await docRef.get();
    if (!currentSnap.exists) {
      return actionError("Insumo não encontrado");
    }
    const currentData = currentSnap.data()!;
    const oldCostPerUnit = currentData.costPerUnit;

    const updateData = {
      ...(input as Record<string, unknown>),
      updatedAt: nowISO(),
    };

    await docRef.update(updateData);

    const newCostPerUnit =
      (input as Record<string, unknown>).costPerUnit ?? oldCostPerUnit;

    // If costPerUnit changed, cascade update to technical sheets and products
    if (newCostPerUnit !== oldCostPerUnit) {
      const sheetsCol = tenantCollection(user.tenantId, "technicalSheets");
      const sheetsSnap = await sheetsCol.get();

      // Filter sheets that use this ingredient
      const affectedSheets = sheetsSnap.docs.filter((doc) => {
        const data = doc.data();
        return (data.ingredients || []).some(
          (ing: { ingredientId: string }) => ing.ingredientId === id,
        );
      });

      if (affectedSheets.length > 0) {
        // Fetch all ingredients to build prices map
        const allIngredientsSnap = await col.get();
        const ingredientPrices = new Map<string, number>();
        for (const ingDoc of allIngredientsSnap.docs) {
          const ingData = ingDoc.data();
          // Use the new costPerUnit for the updated ingredient
          if (ingDoc.id === id) {
            ingredientPrices.set(ingDoc.id, newCostPerUnit as number);
          } else {
            ingredientPrices.set(ingDoc.id, ingData.costPerUnit);
          }
        }

        const batch = adminDb.batch();
        const productsCol = tenantCollection(user.tenantId, "products");

        for (const sheetDoc of affectedSheets) {
          const sheet = sheetDoc.data() as {
            productId: string;
            yieldQuantity: number;
            yieldUnit?: string;
            totalWeightAfterOven?: number;
            ingredients: {
              ingredientId: string;
              ingredientName: string;
              quantity: number;
              unit: string;
              cost: number;
            }[];
          };

          // Fetch the linked product
          const productRef = productsCol.doc(sheet.productId);
          const productSnap = await productRef.get();
          const product = productSnap.exists ? productSnap.data() : undefined;

          const result = calculateSheetCost(sheet, ingredientPrices, product);

          // Update the technical sheet
          batch.update(sheetDoc.ref, {
            totalCost: result.totalCost,
            costPerUnit: result.costPerUnit,
            ingredients: result.updatedIngredients,
            updatedAt: nowISO(),
          });

          // Update the linked product
          if (productSnap.exists) {
            batch.update(productRef, {
              costPrice: result.costPerUnit,
              profitMargin: result.profitMargin,
              updatedAt: nowISO(),
            });
          }
        }

        await batch.commit();
      }
    }

    return actionResponse({ id });
  } catch (error) {
    return actionError(
      error instanceof Error ? error.message : "Erro ao atualizar insumo",
    );
  }
}

export async function deleteIngredient(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getAuthenticatedUser();

    // Check if ingredient is used in any technical sheet
    const sheetsCol = tenantCollection(user.tenantId, "technicalSheets");
    const sheetsSnap = await sheetsCol.get();

    const isUsed = sheetsSnap.docs.some((doc) => {
      const data = doc.data();
      return (data.ingredients || []).some(
        (ing: { ingredientId: string }) => ing.ingredientId === id,
      );
    });

    if (isUsed) {
      return actionError(
        "Insumo utilizado em fichas técnicas. Remova das fichas antes de excluir.",
      );
    }

    const col = tenantCollection(user.tenantId, "ingredients");
    await col.doc(id).delete();

    return actionResponse({ id });
  } catch (error) {
    return actionError(
      error instanceof Error ? error.message : "Erro ao excluir insumo",
    );
  }
}

export async function listIngredients(): Promise<
  ActionResult<Array<{ id: string } & Record<string, unknown>>>
> {
  try {
    const user = await getAuthenticatedUser();
    const col = tenantCollection(user.tenantId, "ingredients");
    const snap = await col.get();

    const ingredients = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return actionResponse(ingredients);
  } catch (error) {
    return actionError(
      error instanceof Error ? error.message : "Erro ao listar insumos",
    );
  }
}
