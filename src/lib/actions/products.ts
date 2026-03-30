"use server";

import { adminDb } from "@/lib/firebase/admin";
import { CreateProductSchema, CreateTechnicalSheetSchema } from "@/lib/db/schemas";
import {
  type ActionResult,
  actionResponse,
  actionError,
  getAuthenticatedUser,
  nowISO,
  tenantCollection,
} from "./utils";
import { calculateSheetCost, calculateProfitMargin } from "./helpers";

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function createProduct(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = CreateProductSchema.safeParse(input);
    if (!parsed.success) {
      return actionError(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const { tenantId } = await getAuthenticatedUser();
    const now = nowISO();

    const col = tenantCollection(tenantId, "products");
    const docRef = col.doc();

    await docRef.set({
      ...parsed.data,
      id: docRef.id,
      createdAt: now,
      updatedAt: now,
    });

    return actionResponse({ id: docRef.id });
  } catch (err) {
    return actionError(
      err instanceof Error ? err.message : "Erro ao criar produto",
    );
  }
}

export async function updateProduct(
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenantId } = await getAuthenticatedUser();
    const now = nowISO();

    const docRef = tenantCollection(tenantId, "products").doc(id);
    await docRef.update({
      ...(input as Record<string, unknown>),
      updatedAt: now,
    });

    return actionResponse({ id });
  } catch (err) {
    return actionError(
      err instanceof Error ? err.message : "Erro ao atualizar produto",
    );
  }
}

export async function deleteProduct(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenantId } = await getAuthenticatedUser();

    // Check if product has a linked technical sheet
    const sheetsSnap = await tenantCollection(tenantId, "technicalSheets")
      .where("productId", "==", id)
      .limit(1)
      .get();

    if (!sheetsSnap.empty) {
      return actionError(
        "Produto possui ficha técnica vinculada. Remova a ficha antes de excluir.",
      );
    }

    await tenantCollection(tenantId, "products").doc(id).delete();

    return actionResponse({ id });
  } catch (err) {
    return actionError(
      err instanceof Error ? err.message : "Erro ao excluir produto",
    );
  }
}

// ---------------------------------------------------------------------------
// Technical Sheets
// ---------------------------------------------------------------------------

export async function createTechnicalSheet(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = CreateTechnicalSheetSchema.safeParse(input);
    if (!parsed.success) {
      return actionError(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const { tenantId } = await getAuthenticatedUser();
    const now = nowISO();
    const data = parsed.data;

    // Fetch current ingredient prices
    const ingredientPrices = new Map<string, number>();
    const ingredientsCol = tenantCollection(tenantId, "ingredients");

    for (const ing of data.ingredients) {
      const ingSnap = await ingredientsCol.doc(ing.ingredientId).get();
      if (ingSnap.exists) {
        const ingData = ingSnap.data()!;
        ingredientPrices.set(ing.ingredientId, ingData.costPerUnit ?? 0);
      }
    }

    // Fetch the linked product
    const productRef = tenantCollection(tenantId, "products").doc(data.productId);
    const productSnap = await productRef.get();

    if (!productSnap.exists) {
      return actionError("Produto não encontrado");
    }

    const product = productSnap.data()!;

    // Calculate costs
    const { totalCost, costPerUnit, updatedIngredients, profitMargin } =
      calculateSheetCost(
        { ...data, ingredients: data.ingredients },
        ingredientPrices,
        {
          unit: product.unit,
          weightPerUnit: product.weightPerUnit,
          sellPrice: product.sellPrice,
        },
      );

    // Batch: create sheet + update product
    const batch = adminDb.batch();

    const sheetRef = tenantCollection(tenantId, "technicalSheets").doc();
    batch.set(sheetRef, {
      ...data,
      id: sheetRef.id,
      ingredients: updatedIngredients,
      totalCost,
      costPerUnit,
      createdAt: now,
      updatedAt: now,
    });

    batch.update(productRef, {
      costPrice: costPerUnit,
      profitMargin,
      technicalSheetId: sheetRef.id,
      updatedAt: now,
    });

    await batch.commit();

    return actionResponse({ id: sheetRef.id });
  } catch (err) {
    return actionError(
      err instanceof Error ? err.message : "Erro ao criar ficha técnica",
    );
  }
}

export async function updateTechnicalSheet(
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenantId } = await getAuthenticatedUser();
    const now = nowISO();
    const data = input as Record<string, unknown>;

    const sheetRef = tenantCollection(tenantId, "technicalSheets").doc(id);
    const sheetSnap = await sheetRef.get();

    if (!sheetSnap.exists) {
      return actionError("Ficha técnica não encontrada");
    }

    const existingSheet = sheetSnap.data()!;
    const mergedSheet = { ...existingSheet, ...data };

    // Fetch current ingredient prices
    const ingredientPrices = new Map<string, number>();
    const ingredientsCol = tenantCollection(tenantId, "ingredients");
    const sheetIngredients = (mergedSheet.ingredients || []) as {
      ingredientId: string;
      ingredientName: string;
      quantity: number;
      unit: string;
      cost: number;
    }[];

    for (const ing of sheetIngredients) {
      const ingSnap = await ingredientsCol.doc(ing.ingredientId).get();
      if (ingSnap.exists) {
        const ingData = ingSnap.data()!;
        ingredientPrices.set(ing.ingredientId, ingData.costPerUnit ?? 0);
      }
    }

    // Fetch the linked product
    const productId = mergedSheet.productId as string;
    const productRef = tenantCollection(tenantId, "products").doc(productId);
    const productSnap = await productRef.get();

    if (!productSnap.exists) {
      return actionError("Produto vinculado não encontrado");
    }

    const product = productSnap.data()!;

    // Calculate costs
    const { totalCost, costPerUnit, updatedIngredients, profitMargin } =
      calculateSheetCost(
        {
          yieldQuantity: mergedSheet.yieldQuantity as number,
          yieldUnit: mergedSheet.yieldUnit as string | undefined,
          totalWeightAfterOven: mergedSheet.totalWeightAfterOven as
            | number
            | undefined,
          ingredients: sheetIngredients,
        },
        ingredientPrices,
        {
          unit: product.unit,
          weightPerUnit: product.weightPerUnit,
          sellPrice: product.sellPrice,
        },
      );

    // Batch: update sheet + update product
    const batch = adminDb.batch();

    batch.update(sheetRef, {
      ...data,
      ingredients: updatedIngredients,
      totalCost,
      costPerUnit,
      updatedAt: now,
    });

    batch.update(productRef, {
      costPrice: costPerUnit,
      profitMargin,
      updatedAt: now,
    });

    await batch.commit();

    return actionResponse({ id });
  } catch (err) {
    return actionError(
      err instanceof Error ? err.message : "Erro ao atualizar ficha técnica",
    );
  }
}

export async function deleteTechnicalSheet(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenantId } = await getAuthenticatedUser();
    const now = nowISO();

    const sheetRef = tenantCollection(tenantId, "technicalSheets").doc(id);
    const sheetSnap = await sheetRef.get();

    if (!sheetSnap.exists) {
      return actionError("Ficha técnica não encontrada");
    }

    const sheet = sheetSnap.data()!;
    const productId = sheet.productId as string;
    const productRef = tenantCollection(tenantId, "products").doc(productId);

    const batch = adminDb.batch();

    batch.delete(sheetRef);
    batch.update(productRef, {
      technicalSheetId: null,
      costPrice: 0,
      profitMargin: 0,
      updatedAt: now,
    });

    await batch.commit();

    return actionResponse({ id });
  } catch (err) {
    return actionError(
      err instanceof Error ? err.message : "Erro ao excluir ficha técnica",
    );
  }
}

// ---------------------------------------------------------------------------
// Recalc All Costs
// ---------------------------------------------------------------------------

export async function recalcAllCosts(): Promise<
  ActionResult<{ updated: number }>
> {
  try {
    const { tenantId } = await getAuthenticatedUser();
    const now = nowISO();

    // Fetch ALL ingredients to build price map
    const ingredientsSnap = await tenantCollection(
      tenantId,
      "ingredients",
    ).get();
    const ingredientPrices = new Map<string, number>();
    for (const doc of ingredientsSnap.docs) {
      const data = doc.data();
      ingredientPrices.set(doc.id, data.costPerUnit ?? 0);
    }

    // Fetch ALL technical sheets
    const sheetsSnap = await tenantCollection(
      tenantId,
      "technicalSheets",
    ).get();

    let updated = 0;
    let batch = adminDb.batch();
    let opsInBatch = 0;
    const MAX_OPS = 400;

    for (const sheetDoc of sheetsSnap.docs) {
      const sheet = sheetDoc.data();
      const sheetIngredients = (sheet.ingredients || []) as {
        ingredientId: string;
        ingredientName: string;
        quantity: number;
        unit: string;
        cost: number;
      }[];

      if (sheetIngredients.length === 0) continue;

      // Fetch the linked product
      const productId = sheet.productId as string;
      const productRef = tenantCollection(tenantId, "products").doc(productId);
      const productSnap = await productRef.get();

      if (!productSnap.exists) continue;

      const product = productSnap.data()!;

      const { totalCost, costPerUnit, updatedIngredients, profitMargin } =
        calculateSheetCost(
          {
            yieldQuantity: sheet.yieldQuantity as number,
            yieldUnit: sheet.yieldUnit as string | undefined,
            totalWeightAfterOven: sheet.totalWeightAfterOven as
              | number
              | undefined,
            ingredients: sheetIngredients,
          },
          ingredientPrices,
          {
            unit: product.unit,
            weightPerUnit: product.weightPerUnit,
            sellPrice: product.sellPrice,
          },
        );

      // Update sheet
      batch.update(sheetDoc.ref, {
        ingredients: updatedIngredients,
        totalCost,
        costPerUnit,
        updatedAt: now,
      });
      opsInBatch++;

      // Update product
      batch.update(productRef, {
        costPrice: costPerUnit,
        profitMargin,
        updatedAt: now,
      });
      opsInBatch++;

      updated++;

      // Commit batch if approaching Firestore limit
      if (opsInBatch >= MAX_OPS) {
        await batch.commit();
        batch = adminDb.batch();
        opsInBatch = 0;
      }
    }

    // Commit remaining operations
    if (opsInBatch > 0) {
      await batch.commit();
    }

    return actionResponse({ updated });
  } catch (err) {
    return actionError(
      err instanceof Error ? err.message : "Erro ao recalcular custos",
    );
  }
}
