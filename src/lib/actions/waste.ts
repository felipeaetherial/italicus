"use server";

import { adminDb } from "@/lib/firebase/admin";
import { CreateWasteEntrySchema } from "@/lib/db/schemas";
import {
  type ActionResult,
  actionResponse,
  actionError,
  nowISO,
  tenantCollection,
} from "./db";
import { getAuthenticatedUser } from "./utils";

// ---------------------------------------------------------------------------
// createWasteEntry
// ---------------------------------------------------------------------------
export async function createWasteEntry(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const result = CreateWasteEntrySchema.safeParse(input);
    if (!result.success) {
      return actionError(result.error.issues[0].message);
    }

    const data = result.data;
    const { tenantId } = await getAuthenticatedUser();
    const batch = adminDb.batch();
    const now = nowISO();

    // 1. Create WasteEntry doc
    const wasteCol = tenantCollection(tenantId, "wasteEntries");
    const entryRef = wasteCol.doc();
    const entryId = entryRef.id;

    batch.set(entryRef, {
      ...data,
      createdAt: now,
      updatedAt: now,
    });

    const ingredientsCol = tenantCollection(tenantId, "ingredients");

    // 2. If type === "insumo" and itemId: subtract quantity from ingredient stockQuantity
    if (data.type === "insumo" && data.itemId) {
      const ingredientRef = ingredientsCol.doc(data.itemId);
      const ingredientSnap = await ingredientRef.get();

      if (ingredientSnap.exists) {
        const ingredientData = ingredientSnap.data()!;
        if (ingredientData.trackStock) {
          batch.update(ingredientRef, {
            stockQuantity: Math.max(
              0,
              (ingredientData.stockQuantity || 0) - data.quantity,
            ),
            updatedAt: now,
          });
        }
      }
    }

    // 3. If type === "produto" and itemId: fetch product's TechnicalSheet,
    //    calculate proportional ingredient usage and debit each ingredient
    if (data.type === "produto" && data.itemId) {
      const sheetsCol = tenantCollection(tenantId, "technicalSheets");
      const sheetsSnap = await sheetsCol
        .where("productId", "==", data.itemId)
        .limit(1)
        .get();

      if (!sheetsSnap.empty) {
        const sheet = sheetsSnap.docs[0].data();
        const yieldQuantity = sheet.yieldQuantity || 1;
        const ratio = data.quantity / yieldQuantity;

        const sheetIngredients = (sheet.ingredients || []) as {
          ingredientId: string;
          quantity: number;
        }[];

        for (const sheetIngredient of sheetIngredients) {
          const qtyToDebit = sheetIngredient.quantity * ratio;
          const ingredientRef = ingredientsCol.doc(
            sheetIngredient.ingredientId,
          );
          const ingredientSnap = await ingredientRef.get();

          if (ingredientSnap.exists) {
            const ingredientData = ingredientSnap.data()!;
            if (ingredientData.trackStock) {
              batch.update(ingredientRef, {
                stockQuantity: Math.max(
                  0,
                  (ingredientData.stockQuantity || 0) - qtyToDebit,
                ),
                updatedAt: now,
              });
            }
          }
        }
      }
    }

    await batch.commit();
    return actionResponse({ id: entryId });
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "Erro inesperado");
  }
}

// ---------------------------------------------------------------------------
// deleteWasteEntry
// ---------------------------------------------------------------------------
export async function deleteWasteEntry(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenantId } = await getAuthenticatedUser();
    const batch = adminDb.batch();
    const now = nowISO();

    // 1. Fetch the entry
    const wasteCol = tenantCollection(tenantId, "wasteEntries");
    const entryRef = wasteCol.doc(id);
    const entrySnap = await entryRef.get();

    if (!entrySnap.exists) {
      return actionError("Registro de desperdício não encontrado");
    }

    const entry = entrySnap.data()!;
    const ingredientsCol = tenantCollection(tenantId, "ingredients");

    // 2. Reverse the stock changes (add back quantities)
    if (entry.type === "insumo" && entry.itemId) {
      const ingredientRef = ingredientsCol.doc(entry.itemId);
      const ingredientSnap = await ingredientRef.get();

      if (ingredientSnap.exists) {
        const ingredientData = ingredientSnap.data()!;
        if (ingredientData.trackStock) {
          batch.update(ingredientRef, {
            stockQuantity:
              (ingredientData.stockQuantity || 0) + (entry.quantity || 0),
            updatedAt: now,
          });
        }
      }
    }

    if (entry.type === "produto" && entry.itemId) {
      const sheetsCol = tenantCollection(tenantId, "technicalSheets");
      const sheetsSnap = await sheetsCol
        .where("productId", "==", entry.itemId)
        .limit(1)
        .get();

      if (!sheetsSnap.empty) {
        const sheet = sheetsSnap.docs[0].data();
        const yieldQuantity = sheet.yieldQuantity || 1;
        const ratio = (entry.quantity || 0) / yieldQuantity;

        const sheetIngredients = (sheet.ingredients || []) as {
          ingredientId: string;
          quantity: number;
        }[];

        for (const sheetIngredient of sheetIngredients) {
          const qtyToRevert = sheetIngredient.quantity * ratio;
          const ingredientRef = ingredientsCol.doc(
            sheetIngredient.ingredientId,
          );
          const ingredientSnap = await ingredientRef.get();

          if (ingredientSnap.exists) {
            const ingredientData = ingredientSnap.data()!;
            if (ingredientData.trackStock) {
              batch.update(ingredientRef, {
                stockQuantity:
                  (ingredientData.stockQuantity || 0) + qtyToRevert,
                updatedAt: now,
              });
            }
          }
        }
      }
    }

    // 3. Delete the entry
    batch.delete(entryRef);

    await batch.commit();
    return actionResponse({ id });
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "Erro inesperado");
  }
}
