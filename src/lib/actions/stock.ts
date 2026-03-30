"use server";

import { adminDb } from "@/lib/firebase/admin";
import { CreateStockEntrySchema } from "@/lib/db/schemas";
import {
  type ActionResult,
  actionResponse,
  actionError,
  getAuthenticatedUser,
  nowISO,
  tenantCollection,
} from "./utils";

// ---------------------------------------------------------------------------
// createStockEntry
// ---------------------------------------------------------------------------
export async function createStockEntry(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const result = CreateStockEntrySchema.safeParse(input);
    if (!result.success) {
      return actionError(result.error.issues[0].message);
    }

    const data = result.data;
    const { tenantId } = await getAuthenticatedUser();
    const batch = adminDb.batch();
    const now = nowISO();
    const today = new Date().toISOString().split("T")[0];

    // 1. Create StockEntry doc
    const stockEntriesCol = tenantCollection(tenantId, "stockEntries");
    const entryRef = stockEntriesCol.doc();
    const entryId = entryRef.id;

    // 2. For each item of type "insumo": update ingredient stockQuantity and costPerUnit
    const ingredientsCol = tenantCollection(tenantId, "ingredients");
    for (const item of data.items) {
      if (item.type === "insumo") {
        const ingredientRef = ingredientsCol.doc(item.itemId);
        const ingredientSnap = await ingredientRef.get();
        if (ingredientSnap.exists) {
          const ingredientData = ingredientSnap.data()!;
          batch.update(ingredientRef, {
            stockQuantity: (ingredientData.stockQuantity || 0) + item.quantity,
            costPerUnit: item.unitCost,
            updatedAt: now,
          });
        }
      }
    }

    // 3. Create AccountPayable
    const apCol = tenantCollection(tenantId, "accountsPayable");
    const apRef = apCol.doc();
    const dueDate =
      data.paymentDueDate ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

    batch.set(apRef, {
      description: `NF ${data.invoiceNumber || "S/N"} - ${data.supplierName}`,
      supplierId: data.supplierId || null,
      supplierName: data.supplierName,
      amount: data.totalAmount,
      dueDate,
      status: "pendente",
      category: "compra_insumo",
      costGroup: "variavel",
      createdAt: now,
      updatedAt: now,
    });

    // 4. Set the StockEntry doc with accountPayableId
    batch.set(entryRef, {
      ...data,
      accountPayableId: apRef.id,
      createdAt: now,
      updatedAt: now,
    });

    await batch.commit();
    return actionResponse({ id: entryId });
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "Erro inesperado");
  }
}

// ---------------------------------------------------------------------------
// deleteStockEntry
// ---------------------------------------------------------------------------
export async function deleteStockEntry(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenantId } = await getAuthenticatedUser();
    const batch = adminDb.batch();

    // 1. Fetch the entry
    const stockEntriesCol = tenantCollection(tenantId, "stockEntries");
    const entryRef = stockEntriesCol.doc(id);
    const entrySnap = await entryRef.get();

    if (!entrySnap.exists) {
      return actionError("Entrada de estoque não encontrada");
    }

    const entry = entrySnap.data()!;
    const now = nowISO();

    // 2. For each item: revert ingredient stockQuantity
    const ingredientsCol = tenantCollection(tenantId, "ingredients");
    const items = (entry.items || []) as {
      type: string;
      itemId: string;
      quantity: number;
    }[];

    for (const item of items) {
      if (item.type === "insumo") {
        const ingredientRef = ingredientsCol.doc(item.itemId);
        const ingredientSnap = await ingredientRef.get();
        if (ingredientSnap.exists) {
          const ingredientData = ingredientSnap.data()!;
          batch.update(ingredientRef, {
            stockQuantity: Math.max(
              0,
              (ingredientData.stockQuantity || 0) - item.quantity,
            ),
            updatedAt: now,
          });
        }
      }
    }

    // 3. If accountPayableId: delete the AccountPayable
    if (entry.accountPayableId) {
      const apRef = tenantCollection(tenantId, "accountsPayable").doc(
        entry.accountPayableId,
      );
      batch.delete(apRef);
    }

    // 4. Delete the StockEntry
    batch.delete(entryRef);

    await batch.commit();
    return actionResponse({ id });
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "Erro inesperado");
  }
}

// ---------------------------------------------------------------------------
// adjustStock
// ---------------------------------------------------------------------------
export async function adjustStock(input: {
  items: { ingredientId: string; countedQuantity: number }[];
}): Promise<ActionResult<{ updated: number }>> {
  try {
    const { tenantId } = await getAuthenticatedUser();
    const batch = adminDb.batch();
    const now = nowISO();
    const ingredientsCol = tenantCollection(tenantId, "ingredients");

    for (const item of input.items) {
      const ingredientRef = ingredientsCol.doc(item.ingredientId);
      batch.update(ingredientRef, {
        stockQuantity: item.countedQuantity,
        updatedAt: now,
      });
    }

    await batch.commit();
    return actionResponse({ updated: input.items.length });
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "Erro inesperado");
  }
}
