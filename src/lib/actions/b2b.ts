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
import { calculateDueDate } from "./db";

// ---------------------------------------------------------------------------
// B2B Catalog (auth-based)
// ---------------------------------------------------------------------------

export async function getB2bCatalog(): Promise<
  ActionResult<{
    products: Record<string, Array<{ id: string } & Record<string, unknown>>>;
    tenantName: string;
  }>
> {
  try {
    const { tenantId } = await getAuthenticatedUser();

    // Fetch tenant doc to get the name
    const tenantDoc = await adminDb.collection("tenants").doc(tenantId).get();
    if (!tenantDoc.exists) {
      return actionError("Tenant não encontrado");
    }
    const tenantName = (tenantDoc.data()?.name as string) || "";

    const productsSnap = await tenantCollection(tenantId, "products")
      .where("isActive", "==", true)
      .where("isB2bVisible", "==", true)
      .get();

    const grouped: Record<
      string,
      Array<{ id: string } & Record<string, unknown>>
    > = {};

    for (const doc of productsSnap.docs) {
      const data = doc.data();
      const category = (data.category as string) || "outro";

      if (!grouped[category]) {
        grouped[category] = [];
      }

      grouped[category].push({ id: doc.id, ...data });
    }

    // Sort products by name within each category
    for (const category of Object.keys(grouped)) {
      grouped[category].sort((a, b) => {
        const nameA = ((a.name as string) || "").toLowerCase();
        const nameB = ((b.name as string) || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }

    return actionResponse({ products: grouped, tenantName });
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
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    unit: string;
  }[];
  deliveryDate: string;
  notes?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId, tenantId, role } = await getAuthenticatedUser();

    if (role !== "b2b_client") {
      return actionError("Acesso restrito a clientes B2B");
    }

    // Validate deliveryDate >= tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    if (input.deliveryDate < tomorrowStr) {
      return actionError(
        "A data de entrega deve ser a partir de amanhã",
      );
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

    // Add total to each item
    const itemsWithTotal = input.items.map((item) => ({
      ...item,
      total: item.quantity * item.unitPrice,
    }));

    // Calculate total amount
    const totalAmount = itemsWithTotal.reduce(
      (sum, item) => sum + item.total,
      0,
    );

    // Use deliveryDate as productionDate
    const productionDate = input.deliveryDate;

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
      items: itemsWithTotal,
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
      items: itemsWithTotal,
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
// Repeat Order
// ---------------------------------------------------------------------------

export async function repeatOrder(
  orderId: string,
): Promise<
  ActionResult<
    Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      unit: string;
    }>
  >
> {
  try {
    const { tenantId } = await getAuthenticatedUser();

    const orderDoc = await tenantCollection(tenantId, "orders")
      .doc(orderId)
      .get();

    if (!orderDoc.exists) {
      return actionError("Pedido não encontrado");
    }

    const orderData = orderDoc.data()!;
    const items = (orderData.items as Array<Record<string, unknown>>) || [];

    const validItems: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      unit: string;
    }> = [];

    for (const item of items) {
      const productId = item.productId as string;
      if (!productId) continue;

      const productDoc = await tenantCollection(tenantId, "products")
        .doc(productId)
        .get();

      if (!productDoc.exists) continue;

      const productData = productDoc.data()!;
      if (!productData.isActive || !productData.isB2bVisible) continue;

      validItems.push({
        productId,
        productName: (item.productName as string) || (productData.name as string) || "",
        quantity: (item.quantity as number) || 1,
        unitPrice: (productData.sellPrice as number) || (item.unitPrice as number) || 0,
        unit: (item.unit as string) || (productData.unit as string) || "un",
      });
    }

    return actionResponse(validItems);
  } catch (err) {
    return actionError(
      err instanceof Error ? err.message : "Erro ao repetir pedido",
    );
  }
}

// ---------------------------------------------------------------------------
// My B2B Orders
// ---------------------------------------------------------------------------

export async function getB2bMyOrders(
  filters?: { status?: string },
): Promise<ActionResult<unknown[]>> {
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

    let query: FirebaseFirestore.Query = tenantCollection(tenantId, "orders")
      .where("customerId", "==", customerId);

    if (filters?.status) {
      query = query.where("status", "==", filters.status);
    }

    query = query.orderBy("createdAt", "desc");

    const ordersSnap = await query.get();

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

interface B2bFinancialData {
  receivables: Array<{ id: string } & Record<string, unknown>>;
  totalOpen: number;
  totalOverdue: number;
  lastPaymentDate: string | null;
}

export async function getB2bFinancial(): Promise<ActionResult<B2bFinancialData>> {
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

    const receivables: Array<{ id: string } & Record<string, unknown>> =
      arSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

    const today = new Date().toISOString().split("T")[0];

    let totalOpen = 0;
    let totalOverdue = 0;
    let lastPaymentDate: string | null = null;

    for (const r of receivables) {
      const status = r.status as string;
      const amount = (r.amount as number) || 0;

      if (status === "pendente") {
        totalOpen += amount;
        const dueDate = r.dueDate as string;
        if (dueDate && dueDate < today) {
          totalOverdue += amount;
        }
      }

      if (status === "recebido") {
        const receiptDate = r.receiptDate as string;
        if (receiptDate && (!lastPaymentDate || receiptDate > lastPaymentDate)) {
          lastPaymentDate = receiptDate;
        }
      }
    }

    return actionResponse({
      receivables,
      totalOpen,
      totalOverdue,
      lastPaymentDate,
    });
  } catch (err) {
    return actionError(
      err instanceof Error ? err.message : "Erro ao buscar financeiro B2B",
    );
  }
}
