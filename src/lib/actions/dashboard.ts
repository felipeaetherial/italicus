"use server";

import { adminDb } from "@/lib/firebase/admin";
import {
  type ActionResult,
  actionResponse,
  actionError,
  tenantCollection,
} from "./db";
import { getAuthenticatedUser } from "./utils";

interface DashboardData {
  salesToday: number;
  pendingOrders: number;
  overdueReceivables: { count: number; total: number };
  lowStockIngredients: number;
  salesLast30Days: Array<{ date: string; total: number }>;
  salesByPaymentMethod: Array<{
    method: string;
    total: number;
    count: number;
  }>;
  todayOrders: Array<{
    id: string;
    customerName: string;
    items: unknown[];
    totalAmount: number;
    status: string;
  }>;
  upcomingDues: Array<{
    id: string;
    description: string;
    amount: number;
    dueDate: string;
    type: "pagar" | "receber";
    entityName?: string;
  }>;
}

// ---------------------------------------------------------------------------
// getDashboardData
// ---------------------------------------------------------------------------
export async function getDashboardData(): Promise<
  ActionResult<DashboardData>
> {
  try {
    const { tenantId } = await getAuthenticatedUser();
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();

    // 30 days ago date string
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    // 7 days from now
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysFromNowStr = sevenDaysFromNow.toISOString().split("T")[0];

    // 1. Sales today: query where createdAt starts with today
    const salesTodaySnap = await tenantCollection(tenantId, "sales")
      .where("createdAt", ">=", today)
      .where("createdAt", "<=", today + "\uf8ff")
      .get();

    let salesToday = 0;
    for (const doc of salesTodaySnap.docs) {
      const data = doc.data();
      salesToday += (data.totalAmount as number) || 0;
    }

    // 2. Pending orders
    const pendingOrdersSnap = await tenantCollection(tenantId, "orders")
      .where("status", "==", "pendente")
      .get();
    const pendingOrders = pendingOrdersSnap.size;

    // 3. Overdue receivables
    const pendingArSnap = await tenantCollection(
      tenantId,
      "accountsReceivable",
    )
      .where("status", "==", "pendente")
      .get();

    let overdueCount = 0;
    let overdueTotal = 0;
    for (const doc of pendingArSnap.docs) {
      const data = doc.data();
      if (data.dueDate && data.dueDate < today) {
        overdueCount++;
        overdueTotal += (data.amount as number) || 0;
      }
    }

    // 4. Low stock ingredients
    const ingredientsSnap = await tenantCollection(
      tenantId,
      "ingredients",
    ).get();

    let lowStockIngredients = 0;
    for (const doc of ingredientsSnap.docs) {
      const data = doc.data();
      if (
        data.trackStock &&
        (data.stockQuantity ?? 0) <= (data.minStock ?? 0)
      ) {
        lowStockIngredients++;
      }
    }

    // 5. Sales last 30 days
    const salesLast30Snap = await tenantCollection(tenantId, "sales")
      .where("createdAt", ">=", thirtyDaysAgoStr)
      .orderBy("createdAt", "desc")
      .get();

    const salesByDate = new Map<string, number>();
    const salesByMethod = new Map<
      string,
      { total: number; count: number }
    >();

    for (const doc of salesLast30Snap.docs) {
      const data = doc.data();
      const dateStr = ((data.createdAt as string) || "").split("T")[0];
      const amount = (data.totalAmount as number) || 0;
      const method = (data.paymentMethod as string) || "outro";

      // Group by date
      salesByDate.set(dateStr, (salesByDate.get(dateStr) || 0) + amount);

      // Group by payment method
      const existing = salesByMethod.get(method) || {
        total: 0,
        count: 0,
      };
      existing.total += amount;
      existing.count += 1;
      salesByMethod.set(method, existing);
    }

    const salesLast30Days = Array.from(salesByDate.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 6. Sales by payment method
    const salesByPaymentMethod = Array.from(salesByMethod.entries()).map(
      ([method, { total, count }]) => ({ method, total, count }),
    );

    // 7. Today's orders
    const todayOrdersSnap = await tenantCollection(tenantId, "orders")
      .where("productionDate", "==", today)
      .get();

    const todayOrders = todayOrdersSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        customerName: (data.customerName as string) || "",
        items: (data.items as unknown[]) || [],
        totalAmount: (data.totalAmount as number) || 0,
        status: (data.status as string) || "",
      };
    });

    // 8. Upcoming dues (next 7 days)
    const upcomingDues: DashboardData["upcomingDues"] = [];

    // Accounts Payable - pending, due within 7 days
    const pendingApSnap = await tenantCollection(tenantId, "accountsPayable")
      .where("status", "==", "pendente")
      .get();

    for (const doc of pendingApSnap.docs) {
      const data = doc.data();
      if (
        data.dueDate &&
        data.dueDate >= today &&
        data.dueDate <= sevenDaysFromNowStr
      ) {
        upcomingDues.push({
          id: doc.id,
          description: (data.description as string) || "",
          amount: (data.amount as number) || 0,
          dueDate: data.dueDate as string,
          type: "pagar",
          entityName: (data.supplierName as string) || undefined,
        });
      }
    }

    // Accounts Receivable - pending, due within 7 days
    for (const doc of pendingArSnap.docs) {
      const data = doc.data();
      if (
        data.dueDate &&
        data.dueDate >= today &&
        data.dueDate <= sevenDaysFromNowStr
      ) {
        upcomingDues.push({
          id: doc.id,
          description: (data.description as string) || "",
          amount: (data.amount as number) || 0,
          dueDate: data.dueDate as string,
          type: "receber",
          entityName: (data.customerName as string) || undefined,
        });
      }
    }

    // Sort upcoming dues by dueDate
    upcomingDues.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    return actionResponse({
      salesToday,
      pendingOrders,
      overdueReceivables: { count: overdueCount, total: overdueTotal },
      lowStockIngredients,
      salesLast30Days,
      salesByPaymentMethod,
      todayOrders,
      upcomingDues,
    });
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "Erro inesperado");
  }
}
