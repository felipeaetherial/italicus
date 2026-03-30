"use server";

import { adminDb } from "@/lib/firebase/admin";
import { CreateSaleSchema } from "@/lib/db/schemas";
import {
  type ActionResult,
  actionResponse,
  actionError,
  nowISO,
  tenantCollection,
} from "./db";
import { getAuthenticatedUser } from "./utils";
import {
  debitIngredients,
  revertIngredients,
  calculateDueDate,
} from "./helpers";

// ---------------------------------------------------------------------------
// createSale
// ---------------------------------------------------------------------------
export async function createSale(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const result = CreateSaleSchema.safeParse(input);
    if (!result.success) {
      return actionError(result.error.issues[0].message);
    }

    const data = result.data;
    const { tenantId } = await getAuthenticatedUser();
    const batch = adminDb.batch();
    const now = nowISO();
    const today = new Date().toISOString().split("T")[0];

    // 1. Create sale document
    const saleRef = tenantCollection(tenantId, "sales").doc();
    const saleId = saleRef.id;
    const saleDoc = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    batch.set(saleRef, saleDoc);

    const {
      customerId,
      customerName,
      items,
      productionDate,
      paymentMethod,
      paymentDueDate,
      freightType,
      freightValue,
      freightSupplierId,
      freightSupplierName,
      notes,
    } = data;

    const totalAmount =
      items.reduce((sum, item) => sum + item.total, 0) + (freightValue || 0);

    // 2. If productionDate is set (encomenda) -> create Order, do NOT debit ingredients
    if (productionDate) {
      const orderRef = tenantCollection(tenantId, "orders").doc();
      batch.set(orderRef, {
        saleId,
        customerId: customerId || null,
        customerName: customerName || null,
        productionDate,
        items,
        totalAmount,
        freightValue: freightValue || 0,
        freightType: freightType || null,
        paymentMethod,
        status: "pendente",
        notes: notes || null,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      // 3. Venda balcao -> debit ingredients
      await debitIngredients(tenantId, items);
    }

    // 4. Calculate due date
    const dueDate = calculateDueDate(customerName, paymentDueDate);

    // 5. If fiado OR has productionDate -> create AccountReceivable
    if (paymentMethod === "fiado" || productionDate) {
      const arRef = tenantCollection(tenantId, "accountsReceivable").doc();
      batch.set(arRef, {
        description: `Venda para ${customerName}`,
        customerId: customerId || null,
        customerName: customerName || null,
        amount: totalAmount,
        dueDate,
        status: "pendente",
        category: "venda",
        referenceId: saleId,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      // 6. Immediate cash sale -> create CashFlow entry
      const cfRef = tenantCollection(tenantId, "cashFlow").doc();
      batch.set(cfRef, {
        type: "entrada",
        category: "venda",
        description: `Venda ${customerName || "balcao"}`,
        amount: totalAmount,
        date: today,
        paymentMethod,
        referenceId: saleId,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 7. Freight AP handling for third-party freight
    if (freightType === "terceiro" && freightValue && freightValue > 0) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const day5NextMonth = new Date(
        nextMonth.getFullYear(),
        nextMonth.getMonth(),
        5,
      );
      const day5Str = day5NextMonth.toISOString().split("T")[0];

      // Current month boundaries for query
      const startOfMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1,
      );
      const endOfMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        0,
        23,
        59,
        59,
      );

      const existingApSnap = await tenantCollection(tenantId, "accountsPayable")
        .where("supplierId", "==", freightSupplierId)
        .where("category", "==", "frete")
        .where("dueDate", "==", day5Str)
        .get();

      if (!existingApSnap.empty) {
        // Accumulate value on existing AP
        const existingDoc = existingApSnap.docs[0];
        const existingData = existingDoc.data();
        batch.update(existingDoc.ref, {
          amount: (existingData.amount || 0) + freightValue,
          updatedAt: now,
        });
      } else {
        // Create new AP
        const apRef = tenantCollection(tenantId, "accountsPayable").doc();
        batch.set(apRef, {
          description: `Frete - ${freightSupplierName}`,
          supplierId: freightSupplierId,
          supplierName: freightSupplierName,
          amount: freightValue,
          dueDate: day5Str,
          status: "pendente",
          category: "frete",
          costGroup: "variavel",
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    await batch.commit();
    return actionResponse({ id: saleId });
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "Erro inesperado");
  }
}

// ---------------------------------------------------------------------------
// updateSale
// ---------------------------------------------------------------------------
export async function updateSale(input: {
  id: string;
  data: Record<string, unknown>;
  oldSale: Record<string, unknown>;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenantId } = await getAuthenticatedUser();
    const { id, data, oldSale } = input;
    const now = nowISO();

    const oldItems = (oldSale.items || []) as {
      productId: string;
      quantity: number;
    }[];
    const newItems = (data.items || oldSale.items || []) as {
      productId: string;
      quantity: number;
    }[];
    const oldProductionDate = oldSale.productionDate as string | undefined;
    const newProductionDate = (data.productionDate ?? oldSale.productionDate) as
      | string
      | undefined;

    // If old sale was balcao (no productionDate) -> revert ingredients
    if (!oldProductionDate) {
      await revertIngredients(tenantId, oldItems);
    }

    // Update the sale document
    const saleRef = tenantCollection(tenantId, "sales").doc(id);
    await saleRef.update({
      ...data,
      updatedAt: now,
    });

    // If new sale is balcao -> debit ingredients
    if (!newProductionDate) {
      await debitIngredients(tenantId, newItems);
    }

    // Find linked Order by saleId
    let orderSnap = await tenantCollection(tenantId, "orders")
      .where("saleId", "==", id)
      .limit(1)
      .get();

    // Fallback: customerId + productionDate
    if (orderSnap.empty && oldSale.customerId && oldProductionDate) {
      orderSnap = await tenantCollection(tenantId, "orders")
        .where("customerId", "==", oldSale.customerId)
        .where("productionDate", "==", oldProductionDate)
        .limit(1)
        .get();
    }

    // Update Order if found and new data has productionDate
    if (!orderSnap.empty && newProductionDate) {
      const orderDoc = orderSnap.docs[0];
      const orderUpdate: Record<string, unknown> = { updatedAt: now };
      if (data.productionDate !== undefined)
        orderUpdate.productionDate = data.productionDate;
      if (data.items !== undefined) orderUpdate.items = data.items;
      if (data.customerName !== undefined)
        orderUpdate.customerName = data.customerName;
      if (data.customerId !== undefined)
        orderUpdate.customerId = data.customerId;
      if (data.paymentMethod !== undefined)
        orderUpdate.paymentMethod = data.paymentMethod;
      if (data.freightType !== undefined)
        orderUpdate.freightType = data.freightType;
      if (data.freightValue !== undefined)
        orderUpdate.freightValue = data.freightValue;
      if (data.notes !== undefined) orderUpdate.notes = data.notes;

      // Recalculate totalAmount for order
      const updatedItems = (data.items || oldSale.items || []) as {
        total: number;
      }[];
      const updatedFreight =
        ((data.freightValue ?? oldSale.freightValue) as number) || 0;
      orderUpdate.totalAmount =
        updatedItems.reduce((sum, i) => sum + (i.total || 0), 0) +
        updatedFreight;

      await orderDoc.ref.update(orderUpdate);
    }

    // Find linked AccountReceivable by referenceId
    const arSnap = await tenantCollection(tenantId, "accountsReceivable")
      .where("referenceId", "==", id)
      .limit(1)
      .get();

    if (!arSnap.empty) {
      const arDoc = arSnap.docs[0];
      const newCustomerName = (data.customerName ??
        oldSale.customerName) as string;
      const newPaymentDueDate = (data.paymentDueDate ??
        oldSale.paymentDueDate) as string | undefined;
      const dueDate = calculateDueDate(newCustomerName, newPaymentDueDate);

      const updatedItems = (data.items || oldSale.items || []) as {
        total: number;
      }[];
      const updatedFreight =
        ((data.freightValue ?? oldSale.freightValue) as number) || 0;
      const newTotalAmount =
        updatedItems.reduce((sum, i) => sum + (i.total || 0), 0) +
        updatedFreight;

      await arDoc.ref.update({
        amount: newTotalAmount,
        dueDate,
        customerName: newCustomerName,
        customerId: (data.customerId ?? oldSale.customerId) || null,
        updatedAt: now,
      });
    }

    // Handle freight AP changes
    const oldFreightType = oldSale.freightType as string | undefined;
    const oldFreightValue = (oldSale.freightValue as number) || 0;
    const oldFreightSupplierId = oldSale.freightSupplierId as
      | string
      | undefined;

    const newFreightType = (data.freightType ?? oldSale.freightType) as
      | string
      | undefined;
    const newFreightValue =
      ((data.freightValue ?? oldSale.freightValue) as number) || 0;
    const newFreightSupplierId = (data.freightSupplierId ??
      oldSale.freightSupplierId) as string | undefined;
    const newFreightSupplierName = (data.freightSupplierName ??
      oldSale.freightSupplierName) as string | undefined;

    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const day5Str = new Date(
      nextMonth.getFullYear(),
      nextMonth.getMonth(),
      5,
    )
      .toISOString()
      .split("T")[0];

    // Remove old freight from AP if it was terceiro
    if (
      oldFreightType === "terceiro" &&
      oldFreightValue > 0 &&
      oldFreightSupplierId
    ) {
      const oldApSnap = await tenantCollection(tenantId, "accountsPayable")
        .where("supplierId", "==", oldFreightSupplierId)
        .where("category", "==", "frete")
        .where("dueDate", "==", day5Str)
        .limit(1)
        .get();

      if (!oldApSnap.empty) {
        const apDoc = oldApSnap.docs[0];
        const currentAmount = apDoc.data().amount || 0;
        const reducedAmount = currentAmount - oldFreightValue;
        if (reducedAmount <= 0) {
          await apDoc.ref.delete();
        } else {
          await apDoc.ref.update({ amount: reducedAmount, updatedAt: now });
        }
      }
    }

    // Add new freight to AP if terceiro
    if (
      newFreightType === "terceiro" &&
      newFreightValue > 0 &&
      newFreightSupplierId
    ) {
      const newApSnap = await tenantCollection(tenantId, "accountsPayable")
        .where("supplierId", "==", newFreightSupplierId)
        .where("category", "==", "frete")
        .where("dueDate", "==", day5Str)
        .limit(1)
        .get();

      if (!newApSnap.empty) {
        const apDoc = newApSnap.docs[0];
        const currentAmount = apDoc.data().amount || 0;
        await apDoc.ref.update({
          amount: currentAmount + newFreightValue,
          updatedAt: now,
        });
      } else {
        const apRef = tenantCollection(tenantId, "accountsPayable").doc();
        await apRef.set({
          description: `Frete - ${newFreightSupplierName}`,
          supplierId: newFreightSupplierId,
          supplierName: newFreightSupplierName,
          amount: newFreightValue,
          dueDate: day5Str,
          status: "pendente",
          category: "frete",
          costGroup: "variavel",
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return actionResponse({ id });
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "Erro inesperado");
  }
}

// ---------------------------------------------------------------------------
// cancelSale
// ---------------------------------------------------------------------------
export async function cancelSale(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenantId } = await getAuthenticatedUser();
    const now = nowISO();

    // Fetch the sale
    const saleRef = tenantCollection(tenantId, "sales").doc(id);
    const saleSnap = await saleRef.get();
    if (!saleSnap.exists) {
      return actionError("Venda nao encontrada");
    }
    const sale = saleSnap.data()!;

    // If balcao (no productionDate) -> revert ingredients
    if (!sale.productionDate) {
      await revertIngredients(
        tenantId,
        sale.items as { productId: string; quantity: number }[],
      );
    }

    const batch = adminDb.batch();

    // Find linked Order -> update status to "cancelado"
    const orderSnap = await tenantCollection(tenantId, "orders")
      .where("saleId", "==", id)
      .limit(1)
      .get();
    if (!orderSnap.empty) {
      batch.update(orderSnap.docs[0].ref, {
        status: "cancelado",
        updatedAt: now,
      });
    }

    // Find linked AccountReceivable -> delete
    const arSnap = await tenantCollection(tenantId, "accountsReceivable")
      .where("referenceId", "==", id)
      .limit(1)
      .get();
    if (!arSnap.empty) {
      batch.delete(arSnap.docs[0].ref);
    }

    // Find freight AccountPayable -> subtract freight value
    if (
      sale.freightType === "terceiro" &&
      sale.freightValue > 0 &&
      sale.freightSupplierId
    ) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const day5Str = new Date(
        nextMonth.getFullYear(),
        nextMonth.getMonth(),
        5,
      )
        .toISOString()
        .split("T")[0];

      const apSnap = await tenantCollection(tenantId, "accountsPayable")
        .where("supplierId", "==", sale.freightSupplierId)
        .where("category", "==", "frete")
        .where("dueDate", "==", day5Str)
        .limit(1)
        .get();

      if (!apSnap.empty) {
        const apDoc = apSnap.docs[0];
        const currentAmount = apDoc.data().amount || 0;
        const reducedAmount = currentAmount - (sale.freightValue || 0);
        if (reducedAmount <= 0) {
          batch.delete(apDoc.ref);
        } else {
          batch.update(apDoc.ref, { amount: reducedAmount, updatedAt: now });
        }
      }
    }

    // Update sale status to "cancelada"
    batch.update(saleRef, { status: "cancelada", updatedAt: now });

    await batch.commit();
    return actionResponse({ id });
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "Erro inesperado");
  }
}

// ---------------------------------------------------------------------------
// deleteSale
// ---------------------------------------------------------------------------
export async function deleteSale(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenantId } = await getAuthenticatedUser();
    const now = nowISO();

    // Fetch the sale
    const saleRef = tenantCollection(tenantId, "sales").doc(id);
    const saleSnap = await saleRef.get();
    if (!saleSnap.exists) {
      return actionError("Venda nao encontrada");
    }
    const sale = saleSnap.data()!;

    // If balcao (no productionDate) -> revert ingredients
    if (!sale.productionDate) {
      await revertIngredients(
        tenantId,
        sale.items as { productId: string; quantity: number }[],
      );
    }

    const batch = adminDb.batch();

    // Find linked Order -> delete
    const orderSnap = await tenantCollection(tenantId, "orders")
      .where("saleId", "==", id)
      .limit(1)
      .get();
    if (!orderSnap.empty) {
      batch.delete(orderSnap.docs[0].ref);
    }

    // Find linked AccountReceivable -> delete
    const arSnap = await tenantCollection(tenantId, "accountsReceivable")
      .where("referenceId", "==", id)
      .limit(1)
      .get();
    if (!arSnap.empty) {
      batch.delete(arSnap.docs[0].ref);
    }

    // Find freight AccountPayable -> subtract freight value
    if (
      sale.freightType === "terceiro" &&
      sale.freightValue > 0 &&
      sale.freightSupplierId
    ) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const day5Str = new Date(
        nextMonth.getFullYear(),
        nextMonth.getMonth(),
        5,
      )
        .toISOString()
        .split("T")[0];

      const apSnap = await tenantCollection(tenantId, "accountsPayable")
        .where("supplierId", "==", sale.freightSupplierId)
        .where("category", "==", "frete")
        .where("dueDate", "==", day5Str)
        .limit(1)
        .get();

      if (!apSnap.empty) {
        const apDoc = apSnap.docs[0];
        const currentAmount = apDoc.data().amount || 0;
        const reducedAmount = currentAmount - (sale.freightValue || 0);
        if (reducedAmount <= 0) {
          batch.delete(apDoc.ref);
        } else {
          batch.update(apDoc.ref, { amount: reducedAmount, updatedAt: now });
        }
      }
    }

    // Delete the sale
    batch.delete(saleRef);

    await batch.commit();
    return actionResponse({ id });
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "Erro inesperado");
  }
}
