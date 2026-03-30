import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const now = () => new Date().toISOString();
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};
const id = () => adminDb.collection("_").doc().id; // auto-id

/* ------------------------------------------------------------------ */
/*  Auth guard                                                        */
/* ------------------------------------------------------------------ */

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Idempotency check
  const existing = await adminDb
    .collection("tenants")
    .where("slug", "==", "italicus")
    .limit(1)
    .get();

  if (!existing.empty) {
    return NextResponse.json({
      ok: true,
      message: "Seed already exists — skipped.",
      tenantId: existing.docs[0].id,
    });
  }

  /* ---------------------------------------------------------------- */
  /*  IDs                                                             */
  /* ---------------------------------------------------------------- */

  const tenantId = id();
  const ownerId = id();
  const ts = now();

  const supplierIds = Array.from({ length: 3 }, () => id());
  const ingredientIds = Array.from({ length: 10 }, () => id());
  const productIds = Array.from({ length: 8 }, () => id());
  const customerIds = Array.from({ length: 5 }, () => id());
  const sheetIds = Array.from({ length: 3 }, () => id());
  const saleIds = Array.from({ length: 5 }, () => id());
  const orderIds = Array.from({ length: 3 }, () => id());
  const stockEntryIds = Array.from({ length: 2 }, () => id());
  const apIds = Array.from({ length: 3 }, () => id());
  const arIds = Array.from({ length: 3 }, () => id());
  const cfIds = Array.from({ length: 5 }, () => id());
  const wasteIds = Array.from({ length: 2 }, () => id());

  /* ---------------------------------------------------------------- */
  /*  Static data                                                     */
  /* ---------------------------------------------------------------- */

  const supplierNames = ["Moinho Santa Clara", "Distribuidora Bom Grão", "Laticínios Vale Verde"];
  const ingredientData: [string, string, number, number, number, string, number][] = [
    // [name, unit, costPerUnit, stock, minStock, category, supplierIdx]
    ["Farinha de trigo especial", "kg", 4.2, 200, 50, "farinha", 0],
    ["Farinha integral", "kg", 6.5, 80, 20, "farinha", 0],
    ["Fermento biológico seco", "kg", 42, 10, 3, "fermento", 1],
    ["Sal refinado", "kg", 2.1, 30, 10, "outro", 1],
    ["Açúcar cristal", "kg", 5.5, 60, 15, "acucar", 1],
    ["Manteiga sem sal", "kg", 38, 25, 8, "gordura", 2],
    ["Leite integral", "L", 4.8, 50, 15, "laticinio", 2],
    ["Ovos", "un", 0.65, 360, 60, "ovo", 2],
    ["Banha de porco", "kg", 18, 15, 5, "gordura", 1],
    ["Azeite de oliva", "L", 42, 8, 3, "outro", 1],
  ];

  const productData: [string, string, string, number, number, number, string, number, number][] = [
    // [code, name, category, sellPrice, costPrice, margin, unit, weight, ovenLoss]
    ["PAO001", "Pão francês", "pao", 24.9, 9.8, 60.6, "kg", 0.05, 12],
    ["PAO002", "Pão de forma integral", "pao", 14.9, 6.2, 58.4, "un", 0.5, 10],
    ["PAO003", "Ciabatta", "pao", 32.9, 13.5, 59, "kg", 0.15, 14],
    ["PAO004", "Pão de queijo", "pao", 49.9, 18.5, 62.9, "kg", 0.03, 8],
    ["PAO005", "Broa de milho", "pao", 28.9, 11.2, 61.2, "kg", 0.1, 11],
    ["PAO006", "Pão italiano", "pao", 19.9, 7.8, 60.8, "un", 0.4, 15],
    ["PAO007", "Focaccia", "pao", 38.9, 15, 61.4, "un", 0.3, 12],
    ["PAO008", "Baguete", "pao", 8.9, 3.5, 60.7, "un", 0.25, 14],
  ];

  const customerData: [string, string, string, string, boolean][] = [
    ["Restaurante Sabor da Terra", "11987654321", "sabor@terra.com", "Rua das Flores 123", true],
    ["Café Aroma", "11976543210", "cafe@aroma.com", "Av. Brasil 456", true],
    ["Supermercado Bairro", "11965432109", "compras@bairro.com", "Rua do Comércio 789", true],
    ["Maria Souza", "11954321098", "", "Rua Ipê 32", false],
    ["Hotel Pousada Sol", "11943210987", "compras@pousadasol.com", "Estrada Velha 1000", true],
  ];

  /* ---------------------------------------------------------------- */
  /*  Batch writes                                                    */
  /* ---------------------------------------------------------------- */

  const batch = adminDb.batch();
  const t = (path: string) => adminDb.doc(`tenants/${tenantId}/${path}`);

  // 1. Tenant
  batch.set(adminDb.doc(`tenants/${tenantId}`), {
    id: tenantId,
    name: "Italicus Pane & Pasta",
    slug: "italicus",
    ownerId,
    plan: "pro",
    settings: {
      businessName: "Italicus Pane & Pasta",
      cnpj: "12.345.678/0001-90",
      phone: "(11) 3456-7890",
      address: "Rua Augusta 1200, São Paulo - SP",
    },
    createdAt: ts,
    updatedAt: ts,
  });

  // 2. Owner user
  batch.set(adminDb.doc(`users/${ownerId}`), {
    id: ownerId,
    email: "demo@italicus.com.br",
    displayName: "Marco Rossi",
    role: "owner",
    tenantId,
    tenantRole: "admin",
    createdAt: ts,
    updatedAt: ts,
  });

  // 3. Suppliers
  supplierNames.forEach((name, i) => {
    batch.set(t(`suppliers/${supplierIds[i]}`), {
      id: supplierIds[i],
      name,
      phone: `(11) 9${7000 + i}0-${1000 + i}`,
      email: `contato@${name.toLowerCase().replace(/\s/g, "")}.com.br`,
      createdAt: ts,
      updatedAt: ts,
    });
  });

  // 4. Ingredients
  ingredientData.forEach(([name, unit, costPerUnit, stockQuantity, minStock, category, sIdx], i) => {
    batch.set(t(`ingredients/${ingredientIds[i]}`), {
      id: ingredientIds[i],
      name,
      unit,
      costPerUnit,
      stockQuantity,
      minStock,
      trackStock: true,
      supplierId: supplierIds[sIdx as number],
      supplierName: supplierNames[sIdx as number],
      category,
      createdAt: ts,
      updatedAt: ts,
    });
  });

  // 5. Products
  productData.forEach(([code, name, category, sellPrice, costPrice, profitMargin, unit, weightPerUnit, ovenLossPercent], i) => {
    batch.set(t(`products/${productIds[i]}`), {
      id: productIds[i],
      code,
      name,
      category,
      sellPrice,
      costPrice,
      profitMargin,
      unit,
      weightPerUnit,
      ovenLossPercent,
      isActive: true,
      isB2bVisible: true,
      technicalSheetId: i < 3 ? sheetIds[i] : undefined,
      createdAt: ts,
      updatedAt: ts,
    });
  });

  // 6. Customers
  customerData.forEach(([name, phone, email, address, isB2b], i) => {
    batch.set(t(`customers/${customerIds[i]}`), {
      id: customerIds[i],
      code: `CLI${String(i + 1).padStart(3, "0")}`,
      name,
      phone,
      email: email || undefined,
      address,
      isB2bEnabled: isB2b,
      defaultPaymentDueDays: isB2b ? 30 : undefined,
      createdAt: ts,
      updatedAt: ts,
    });
  });

  // 7. Technical sheets (3 products: pão francês, integral, ciabatta)
  const sheetConfigs: [number, number, string, number, number, number, number, number, number[]][] = [
    // [productIdx, yield, yieldUnit, wBefore, wAfter, ovenLoss%, temp, time, ingredientIdxs]
    [0, 20, "kg", 22.7, 20, 12, 220, 18, [0, 2, 3, 6, 8]],
    [1, 10, "un", 5.5, 5, 10, 200, 25, [1, 2, 3, 6, 4]],
    [2, 15, "kg", 17.4, 15, 14, 230, 22, [0, 2, 3, 9, 5]],
  ];

  sheetConfigs.forEach(([pIdx, yieldQty, yieldUnit, wBefore, wAfter, ovenLoss, temp, time, ingIdxs], i) => {
    const ingredients = ingIdxs.map((ii) => ({
      ingredientId: ingredientIds[ii],
      ingredientName: ingredientData[ii][0] as string,
      quantity: +(Math.random() * 3 + 0.5).toFixed(2),
      unit: ingredientData[ii][1] as string,
      cost: +((ingredientData[ii][2] as number) * (Math.random() * 3 + 0.5)).toFixed(2),
    }));
    const totalCost = +ingredients.reduce((s, ig) => s + ig.cost, 0).toFixed(2);

    batch.set(t(`technicalSheets/${sheetIds[i]}`), {
      id: sheetIds[i],
      productId: productIds[pIdx],
      productName: productData[pIdx][1],
      yieldQuantity: yieldQty,
      yieldUnit,
      totalWeightBeforeOven: wBefore,
      totalWeightAfterOven: wAfter,
      ovenLossPercent: ovenLoss,
      ovenTemperature: temp,
      ovenTimeMinutes: time,
      ingredients,
      totalCost,
      costPerUnit: +(totalCost / yieldQty).toFixed(2),
      createdAt: ts,
      updatedAt: ts,
    });
  });

  // 8. Sales (5)
  const saleDays = [2, 5, 8, 12, 18];
  const saleMethods: ("pix" | "dinheiro" | "cartao_debito" | "cartao_credito" | "fiado")[] = [
    "pix", "dinheiro", "cartao_debito", "pix", "fiado",
  ];

  saleDays.forEach((day, i) => {
    const pIdx1 = i % 8;
    const pIdx2 = (i + 3) % 8;
    const qty1 = (i + 1) * 2;
    const qty2 = i + 1;
    const p1Total = +(productData[pIdx1][3] as number * qty1).toFixed(2);
    const p2Total = +(productData[pIdx2][3] as number * qty2).toFixed(2);
    const total = +(p1Total + p2Total).toFixed(2);
    const custIdx = i % 5;

    batch.set(t(`sales/${saleIds[i]}`), {
      id: saleIds[i],
      customerId: customerIds[custIdx],
      customerName: customerData[custIdx][0],
      items: [
        { productId: productIds[pIdx1], productName: productData[pIdx1][1], quantity: qty1, unitPrice: productData[pIdx1][3], total: p1Total },
        { productId: productIds[pIdx2], productName: productData[pIdx2][1], quantity: qty2, unitPrice: productData[pIdx2][3], total: p2Total },
      ],
      totalAmount: total,
      paymentMethod: saleMethods[i],
      status: "concluida",
      origin: i >= 3 ? "b2b" : "admin",
      createdAt: daysAgo(day),
      updatedAt: daysAgo(day),
    });
  });

  // 9. Orders (3)
  const orderDays = [1, 4, 7];
  const orderStatuses: ("pendente" | "confirmado" | "entregue")[] = ["pendente", "confirmado", "entregue"];

  orderDays.forEach((day, i) => {
    const pIdx = (i * 2) % 8;
    const qty = (i + 2) * 5;
    const unitP = productData[pIdx][3] as number;
    const total = +(unitP * qty).toFixed(2);
    const custIdx = i;

    batch.set(t(`orders/${orderIds[i]}`), {
      id: orderIds[i],
      customerId: customerIds[custIdx],
      customerName: customerData[custIdx][0] as string,
      productionDate: daysAgo(day),
      items: [
        { productId: productIds[pIdx], productName: productData[pIdx][1], quantity: qty, unitPrice: unitP, total },
      ],
      totalAmount: total,
      status: orderStatuses[i],
      createdAt: daysAgo(day + 2),
      updatedAt: daysAgo(day),
    });
  });

  // 10. Stock entries (2)
  const stockDays = [10, 20];
  stockDays.forEach((day, i) => {
    const items = [0, 1, 2].map((j) => {
      const ii = i * 3 + j;
      const qty = +(Math.random() * 40 + 10).toFixed(1);
      const cost = ingredientData[ii][2] as number;
      return {
        type: "insumo" as const,
        itemId: ingredientIds[ii],
        itemName: ingredientData[ii][0] as string,
        quantity: qty,
        unit: ingredientData[ii][1] as string,
        unitCost: cost,
        totalCost: +(qty * cost).toFixed(2),
      };
    });
    const total = +items.reduce((s, it) => s + it.totalCost, 0).toFixed(2);

    batch.set(t(`stockEntries/${stockEntryIds[i]}`), {
      id: stockEntryIds[i],
      invoiceNumber: `NF-${2024000 + i}`,
      invoiceDate: daysAgo(day),
      supplierId: supplierIds[i],
      supplierName: supplierNames[i],
      paymentDueDate: daysAgo(day - 30),
      items,
      totalAmount: total,
      accountPayableId: apIds[i],
      createdAt: daysAgo(day),
      updatedAt: daysAgo(day),
    });
  });

  // 11. Accounts Payable (3) — 2 from stock + 1 aluguel
  const apData: [string, string, number, string, string, string, string][] = [
    ["Compra insumos - NF-2024000", "compra_insumo", 450, daysAgo(10), "pago", daysAgo(5), "variavel"],
    ["Compra insumos - NF-2024001", "compra_insumo", 680, daysAgo(20), "pendente", "", "variavel"],
    ["Aluguel março", "aluguel", 3500, daysAgo(1), "pendente", "", "fixo"],
  ];

  apData.forEach(([desc, category, amount, dueDate, status, paymentDate, costGroup], i) => {
    batch.set(t(`accountsPayable/${apIds[i]}`), {
      id: apIds[i],
      description: desc,
      supplierId: i < 2 ? supplierIds[i] : undefined,
      supplierName: i < 2 ? supplierNames[i] : undefined,
      amount,
      dueDate,
      paymentDate: paymentDate || undefined,
      status,
      category,
      costGroup,
      createdAt: daysAgo(i === 2 ? 1 : [10, 20][i]),
      updatedAt: ts,
    });
  });

  // 12. Accounts Receivable (3) — from fiado sale + 2 b2b
  const arData: [number, number, number, string, string][] = [
    // [customerIdx, amount, daysAgoDue, status, category]
    [4, 189.3, 18, "pendente", "venda"],
    [0, 520, 8, "recebido", "venda"],
    [1, 310.5, 5, "pendente", "venda"],
  ];

  arData.forEach(([custIdx, amount, dueDaysAgo, status, category], i) => {
    batch.set(t(`accountsReceivable/${arIds[i]}`), {
      id: arIds[i],
      description: `Venda a prazo - ${customerData[custIdx][0]}`,
      customerId: customerIds[custIdx],
      customerName: customerData[custIdx][0] as string,
      amount,
      dueDate: daysAgo(dueDaysAgo),
      receiptDate: status === "recebido" ? daysAgo(dueDaysAgo - 2) : undefined,
      status,
      category,
      createdAt: daysAgo(dueDaysAgo + 2),
      updatedAt: ts,
    });
  });

  // 13. Cash Flow (5) — mix of entradas and saídas
  const cfData: [string, string, string, number, number, string][] = [
    // [type, category, desc, amount, daysAgo, paymentMethod]
    ["entrada", "venda", "Vendas do dia", 486.5, 2, "pix"],
    ["entrada", "venda", "Vendas do dia", 312, 5, "dinheiro"],
    ["saida", "compra_insumo", "Compra farinha e fermento", 450, 10, "pix"],
    ["saida", "aluguel", "Aluguel março", 3500, 1, "transferencia"],
    ["entrada", "venda", "Encomenda Restaurante Sabor da Terra", 520, 8, "pix"],
  ];

  cfData.forEach(([type, category, description, amount, day, method], i) => {
    batch.set(t(`cashFlow/${cfIds[i]}`), {
      id: cfIds[i],
      type,
      category,
      description,
      amount,
      date: daysAgo(day as number),
      paymentMethod: method,
      createdAt: daysAgo(day as number),
      updatedAt: daysAgo(day as number),
    });
  });

  // 14. Waste entries (2)
  const wasteData: [string, number, string, number, number, string, string][] = [
    ["produto", 0, "Pão francês - sobra do dia", 2.5, 24.75, "vencimento", "kg"],
    ["insumo", 6, "Leite estragado", 3, 14.4, "vencimento", "L"],
  ];

  wasteData.forEach(([type, refIdx, itemName, qty, cost, reason, unit], i) => {
    batch.set(t(`wasteEntries/${wasteIds[i]}`), {
      id: wasteIds[i],
      type,
      itemId: type === "produto" ? productIds[refIdx as number] : ingredientIds[refIdx as number],
      itemName,
      quantity: qty,
      unit,
      estimatedCost: cost,
      reason,
      date: daysAgo(i === 0 ? 3 : 7),
      createdAt: daysAgo(i === 0 ? 3 : 7),
      updatedAt: daysAgo(i === 0 ? 3 : 7),
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Commit                                                          */
  /* ---------------------------------------------------------------- */

  await batch.commit();

  return NextResponse.json({
    ok: true,
    message: "Seed completed successfully.",
    tenantId,
    ownerId,
    counts: {
      suppliers: 3,
      ingredients: 10,
      products: 8,
      customers: 5,
      technicalSheets: 3,
      sales: 5,
      orders: 3,
      stockEntries: 2,
      accountsPayable: 3,
      accountsReceivable: 3,
      cashFlow: 5,
      wasteEntries: 2,
    },
  });
}
