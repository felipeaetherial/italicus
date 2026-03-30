"use server";

import { adminDb } from "@/lib/firebase/admin";
import {
  type ActionResult,
  actionResponse,
  actionError,
  tenantCollection,
} from "./db";
import { getAuthenticatedUser } from "./utils";

interface MonthlyReport {
  revenue: number;
  costs: number;
  grossProfit: number;
  margin: number;
  prevRevenue: number;
  prevCosts: number;
  salesByCustomer: Array<{
    customerId?: string;
    customerName: string;
    count: number;
    total: number;
    percentage: number;
  }>;
  costsByGroup: Array<{ group: string; total: number }>;
  costsByCategory: Array<{
    category: string;
    group: string;
    total: number;
  }>;
  wasteTotal: number;
  wasteByReason: Array<{ reason: string; count: number; total: number }>;
}

// ---------------------------------------------------------------------------
// getMonthlyReport
// ---------------------------------------------------------------------------
export async function getMonthlyReport(
  month: number,
  year: number,
): Promise<ActionResult<MonthlyReport>> {
  try {
    const { tenantId } = await getAuthenticatedUser();

    // Date range for the target month (ISO string date parts)
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

    // Previous month range
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
    const prevEndDate = startDate;

    // 1. Revenue: sum of sales.totalAmount in the month
    const salesSnap = await tenantCollection(tenantId, "sales")
      .where("createdAt", ">=", startDate)
      .where("createdAt", "<", endDate)
      .get();

    let revenue = 0;
    const customerMap = new Map<
      string,
      { customerId?: string; customerName: string; count: number; total: number }
    >();

    for (const doc of salesSnap.docs) {
      const data = doc.data();
      const amount = (data.totalAmount as number) || 0;
      revenue += amount;

      // Group by customer
      const customerKey =
        (data.customerId as string) ||
        (data.customerName as string) ||
        "Balcão";
      const customerName = (data.customerName as string) || "Balcão";
      const existing = customerMap.get(customerKey) || {
        customerId: (data.customerId as string) || undefined,
        customerName,
        count: 0,
        total: 0,
      };
      existing.count += 1;
      existing.total += amount;
      customerMap.set(customerKey, existing);
    }

    // 2. Costs: sum of accountsPayable (paid) in the month
    const apSnap = await tenantCollection(tenantId, "accountsPayable")
      .where("status", "==", "pago")
      .where("paymentDate", ">=", startDate)
      .where("paymentDate", "<", endDate)
      .get();

    let costs = 0;
    const groupMap = new Map<string, number>();
    const categoryMap = new Map<
      string,
      { category: string; group: string; total: number }
    >();

    for (const doc of apSnap.docs) {
      const data = doc.data();
      const amount = (data.amount as number) || 0;
      costs += amount;

      // Group by costGroup
      const group = (data.costGroup as string) || "outro";
      groupMap.set(group, (groupMap.get(group) || 0) + amount);

      // Group by category
      const category = (data.category as string) || "outro";
      const catKey = `${category}__${group}`;
      const existingCat = categoryMap.get(catKey) || {
        category,
        group,
        total: 0,
      };
      existingCat.total += amount;
      categoryMap.set(catKey, existingCat);
    }

    // 3. Gross profit and margin
    const grossProfit = revenue - costs;
    const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    // 4. Previous month revenue and costs
    const prevSalesSnap = await tenantCollection(tenantId, "sales")
      .where("createdAt", ">=", prevStartDate)
      .where("createdAt", "<", prevEndDate)
      .get();

    let prevRevenue = 0;
    for (const doc of prevSalesSnap.docs) {
      const data = doc.data();
      prevRevenue += (data.totalAmount as number) || 0;
    }

    const prevApSnap = await tenantCollection(tenantId, "accountsPayable")
      .where("status", "==", "pago")
      .where("paymentDate", ">=", prevStartDate)
      .where("paymentDate", "<", prevEndDate)
      .get();

    let prevCosts = 0;
    for (const doc of prevApSnap.docs) {
      const data = doc.data();
      prevCosts += (data.amount as number) || 0;
    }

    // 5. Sales by customer with percentage
    const salesByCustomer = Array.from(customerMap.values())
      .map((c) => ({
        ...c,
        percentage: revenue > 0 ? (c.total / revenue) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // 6. Costs by group
    const costsByGroup = Array.from(groupMap.entries())
      .map(([group, total]) => ({ group, total }))
      .sort((a, b) => b.total - a.total);

    // 7. Costs by category
    const costsByCategory = Array.from(categoryMap.values()).sort(
      (a, b) => b.total - a.total,
    );

    // 8. Waste: sum and group by reason
    const wasteSnap = await tenantCollection(tenantId, "wasteEntries")
      .where("createdAt", ">=", startDate)
      .where("createdAt", "<", endDate)
      .get();

    let wasteTotal = 0;
    const wasteReasonMap = new Map<
      string,
      { count: number; total: number }
    >();

    for (const doc of wasteSnap.docs) {
      const data = doc.data();
      const amount = (data.estimatedCost as number) || 0;
      wasteTotal += amount;

      const reason = (data.reason as string) || "outro";
      const existing = wasteReasonMap.get(reason) || {
        count: 0,
        total: 0,
      };
      existing.count += 1;
      existing.total += amount;
      wasteReasonMap.set(reason, existing);
    }

    const wasteByReason = Array.from(wasteReasonMap.entries())
      .map(([reason, { count, total }]) => ({ reason, count, total }))
      .sort((a, b) => b.total - a.total);

    return actionResponse({
      revenue,
      costs,
      grossProfit,
      margin,
      prevRevenue,
      prevCosts,
      salesByCustomer,
      costsByGroup,
      costsByCategory,
      wasteTotal,
      wasteByReason,
    });
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "Erro inesperado");
  }
}
