"use server";

import { adminDb } from "@/lib/firebase/admin";
import {
  type ActionResult,
  actionResponse,
  actionError,
  nowISO,
  tenantCollection,
} from "./db";
import { getAuthenticatedUser } from "./utils";
import { calculateDueDate } from "./helpers";

// ---------------------------------------------------------------------------
// B2B Catalog (public - takes tenantSlug instead of auth)
// ---------------------------------------------------------------------------

export async function getB2bCatalog(
  tenantSlug: string,
): Promise<ActionResult<Record<string, unknown[]>>> {
  try {
    const tenantsSnap = await adminDb
      .collection("tenants")
      .where("slug", "==", tenantSlug)
      .limit(1)
      .get();

    if (tenantsSnap.empty) {
      return actionError("Fábrica não encontrada");
    }

    const tenantId = tenantsSnap.docs[0].id;

    const productsSnap = await tenantCollection(tenantId, "products")
      .where("isActive", "==", true)
      .where("isB2bVisible", "==", true)
      .get();

    const grouped: Record<string, unknown[]> = {};

    for (const doc of productsSnap.docs) {
      const data = doc.data();
      const category = (data.category as string) || "outro";

      if (!grouped[category]) {
        grouped[category] = [];
      }

      grouped[category].push({ id: doc.id, ...data });
    }

    return actionResponse(grouped);
  } catch (err) {
    return actionError(
      err instanceof Error ? err.message : "Erro ao buscar catálogo B2B",
    );
  }
}

// ---------------------------------------------------------------------------
// Create B2B Order
// ---------------------------------------------------------------------------

export async function createB2bOrder(input: {
  tenantId: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  notes?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId, tenantId, role } = await getAuthenticatedUser();

    if (role !== "b2b_client") {
      return actionError("Acesso restrito a clientes B2B");
    }

    if (tenantId !== input.tenantId) {
      return actionError("Acesso não autorizado a este tenant");
    }

    const now = nowISO();

    // Fetch customer linked to this B2B user
    const customersSnap = await tenantCollection(tenantId, "customers")
      .where("b2bUserId", "==", userId)
      .limit(1)
      .get();

    if (customersSnap.empty) {
      return actionError("Cliente B2B não encontrado");
    }

    const customerDoc = customersSnap.docs[0];
    const customerData = customerDoc.data();
    const customerId = customerDoc.id;
    const customerName = customerData.name as string;

    // Calculate total amount
    const totalAmount = input.items.reduce((sum, item) => sum + item.total, 0);

    // Production date = tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const productionDate = tomorrow.toISOString().split("T")[0];

    // Calculate due date based on customer name rules
    const dueDate = calculateDueDate(customerName);

    const batch = adminDb.batch();

    // Create Sale
    const salesCol = tenantCollection(tenantId, "sales");
    const saleRef = salesCol.doc();
    batch.set(saleRef, {
      id: saleRef.id,
      customerId,
      customerName,
      items: input.items,
      totalAmount,
      paymentMethod: "fiado",
      productionDate,
      status: "pendente",
      origin: "b2b",
      notes: input.notes || "",
      createdAt: now,
      updatedAt: now,
    });

    // Create Order
    const ordersCol = tenantCollection(tenantId, "orders");
    const orderRef = ordersCol.doc();
    batch.set(orderRef, {
      id: orderRef.id,
      saleId: saleRef.id,
      customerId,
      customerName,
      productionDate,
      dueDate,
      items: input.items,
      totalAmount,
      paymentMethod: "fiado",
      status: "pendente",
      notes: input.notes || "",
      createdAt: now,
      updatedAt: now,
    });

    // Create Account Receivable
    const arCol = tenantCollection(tenantId, "accountsReceivable");
    const arRef = arCol.doc();
    batch.set(arRef, {
      id: arRef.id,
      description: `Pedido B2B - ${customerName}`,
      customerId,
      customerName,
      amount: totalAmount,
      totalAmount,
      dueDate,
      status: "pendente",
      category: "venda",
      referenceId: saleRef.id,
      createdAt: now,
      updatedAt: now,
    });

    await batch.commit();

    return actionResponse({ id: saleRef.id });
  } catch (err) {
    return actionError(
      err instanceof Error ? err.message : "Erro ao criar pedido B2B",
    );
  }
}

// ---------------------------------------------------------------------------
// My B2B Orders
// ---------------------------------------------------------------------------

export async function getB2bMyOrders(): Promise<ActionResult<unknown[]>> {
  try {
    const { userId, tenantId } = await getAuthenticatedUser();

    // Find customer linked to this B2B user
    const customersSnap = await tenantCollection(tenantId, "customers")
      .where("b2bUserId", "==", userId)
      .limit(1)
      .get();

    if (customersSnap.empty) {
      return actionError("Cliente B2B não encontrado");
    }

    const customerId = customersSnap.docs[0].id;

    const ordersSnap = await tenantCollection(tenantId, "orders")
      .where("customerId", "==", customerId)
      .orderBy("createdAt", "desc")
      .get();

    const orders = ordersSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return actionResponse(orders);
  } catch (err) {
    return actionError(
      err instanceof Error ? err.message : "Erro ao buscar pedidos B2B",
    );
  }
}

// ---------------------------------------------------------------------------
// B2B Financial
// ---------------------------------------------------------------------------

export async function getB2bFinancial(): Promise<ActionResult<unknown[]>> {
  try {
    const { userId, tenantId } = await getAuthenticatedUser();

    // Find customer linked to this B2B user
    const customersSnap = await tenantCollection(tenantId, "customers")
      .where("b2bUserId", "==", userId)
      .limit(1)
      .get();

    if (customersSnap.empty) {
      return actionError("Cliente B2B não encontrado");
    }

    const customerId = customersSnap.docs[0].id;

    const arSnap = await tenantCollection(tenantId, "accountsReceivable")
      .where("customerId", "==", customerId)
      .get();

    const receivables = arSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return actionResponse(receivables);
  } catch (err) {
    return actionError(
      err instanceof Error ? err.message : "Erro ao buscar financeiro B2B",
    );
  }
}
