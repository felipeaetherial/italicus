"use server";

import { adminDb } from "@/lib/firebase/admin";
import {
  CreateAccountPayableSchema,
  CreateAccountReceivableSchema,
  CreateCashFlowSchema,
  UpdateAccountPayableSchema,
  UpdateAccountReceivableSchema,
} from "@/lib/db/schemas";
import {
  type ActionResult,
  actionResponse,
  actionError,
  nowISO,
  tenantCollection,
} from "./db";
import { getAuthenticatedUser } from "./utils";

// ---------------------------------------------------------------------------
// Category mapping: AP category -> CashFlow category
// ---------------------------------------------------------------------------
const apCategoryToCashFlowCategory: Record<string, string> = {
  compra_insumo: "compra_insumo",
  embalagem: "compra_insumo",
  imposto_venda: "outro",
  comissao: "outro",
  salario_producao: "salario",
  salario: "salario",
  aluguel: "aluguel",
  energia: "energia",
  agua: "agua",
  manutencao: "manutencao",
  salario_adm: "salario",
  marketing: "outro",
  sistema: "outro",
  servico_terceiro: "outro",
  equipamento: "equipamento",
  juros: "outro",
  tarifas_bancarias: "outro",
  frete: "frete",
  outro: "outro",
};

// ---------------------------------------------------------------------------
// payAccountPayable
// ---------------------------------------------------------------------------
export async function payAccountPayable(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenantId } = await getAuthenticatedUser();
    const now = nowISO();
    const today = new Date().toISOString().split("T")[0];
    const batch = adminDb.batch();

    // Fetch AP
    const apCol = tenantCollection(tenantId, "accountsPayable");
    const apRef = apCol.doc(id);
    const apSnap = await apRef.get();
    if (!apSnap.exists) {
      return actionError("Conta a pagar não encontrada");
    }
    const ap = apSnap.data()!;

    // Update AP status
    batch.update(apRef, {
      status: "pago",
      paymentDate: today,
      updatedAt: now,
    });

    // Create CashFlow saida
    const cfCol = tenantCollection(tenantId, "cashFlow");
    const cfRef = cfCol.doc();
    const cfCategory = apCategoryToCashFlowCategory[ap.category] || "outro";
    batch.set(cfRef, {
      type: "saida",
      category: cfCategory,
      description: ap.description,
      amount: ap.amount,
      date: today,
      referenceId: id,
      createdAt: now,
      updatedAt: now,
    });

    await batch.commit();
    return actionResponse({ id });
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "Erro inesperado");
  }
}

// ---------------------------------------------------------------------------
// partialPayAccountPayable
// ---------------------------------------------------------------------------
export async function partialPayAccountPayable(input: {
  id: string;
  paidAmount: number;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenantId } = await getAuthenticatedUser();
    const now = nowISO();
    const today = new Date().toISOString().split("T")[0];
    const batch = adminDb.batch();

    const { id, paidAmount } = input;

    // Fetch AP
    const apCol = tenantCollection(tenantId, "accountsPayable");
    const apRef = apCol.doc(id);
    const apSnap = await apRef.get();
    if (!apSnap.exists) {
      return actionError("Conta a pagar não encontrada");
    }
    const ap = apSnap.data()!;

    // Create CashFlow saida with paidAmount
    const cfCol = tenantCollection(tenantId, "cashFlow");
    const cfRef = cfCol.doc();
    const cfCategory = apCategoryToCashFlowCategory[ap.category] || "outro";
    batch.set(cfRef, {
      type: "saida",
      category: cfCategory,
      description: `${ap.description} (pagamento parcial)`,
      amount: paidAmount,
      date: today,
      referenceId: id,
      createdAt: now,
      updatedAt: now,
    });

    // Calculate remaining
    const remaining = (ap.amount || 0) - paidAmount;

    if (remaining <= 0.01) {
      // Fully paid
      batch.update(apRef, {
        status: "pago",
        paymentDate: today,
        amount: 0,
        updatedAt: now,
      });
    } else {
      // Update remaining amount and append to notes
      const existingNotes = ap.notes || "";
      const newNote = `${existingNotes ? existingNotes + "\n" : ""}Pagamento parcial de R$${paidAmount.toFixed(2)} em ${today}`;
      batch.update(apRef, {
        amount: remaining,
        notes: newNote,
        updatedAt: now,
      });
    }

    await batch.commit();
    return actionResponse({ id });
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "Erro inesperado");
  }
}

// ---------------------------------------------------------------------------
// receiveAccountReceivable
// ---------------------------------------------------------------------------
export async function receiveAccountReceivable(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenantId } = await getAuthenticatedUser();
    const now = nowISO();
    const today = new Date().toISOString().split("T")[0];
    const batch = adminDb.batch();

    // Fetch AR
    const arCol = tenantCollection(tenantId, "accountsReceivable");
    const arRef = arCol.doc(id);
    const arSnap = await arRef.get();
    if (!arSnap.exists) {
      return actionError("Conta a receber não encontrada");
    }
    const ar = arSnap.data()!;

    // Update AR status
    batch.update(arRef, {
      status: "recebido",
      receiptDate: today,
      updatedAt: now,
    });

    // Create CashFlow entrada
    const cfCol = tenantCollection(tenantId, "cashFlow");
    const cfRef = cfCol.doc();
    batch.set(cfRef, {
      type: "entrada",
      category: "venda",
      description: ar.description,
      amount: ar.amount,
      date: today,
      referenceId: id,
      createdAt: now,
      updatedAt: now,
    });

    await batch.commit();
    return actionResponse({ id });
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "Erro inesperado");
  }
}

// ---------------------------------------------------------------------------
// createAccountPayable
// ---------------------------------------------------------------------------
export async function createAccountPayable(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const result = CreateAccountPayableSchema.safeParse(input);
    if (!result.success) {
      return actionError(result.error.issues[0].message);
    }

    const data = result.data;
    const { tenantId } = await getAuthenticatedUser();
    const now = nowISO();

    const col = tenantCollection(tenantId, "accountsPayable");
    const ref = col.doc();
    await ref.set({
      ...data,
      createdAt: now,
      updatedAt: now,
    });

    return actionResponse({ id: ref.id });
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "Erro inesperado");
  }
}

// ---------------------------------------------------------------------------
// updateAccountPayable
// ---------------------------------------------------------------------------
export async function updateAccountPayable(
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const result = UpdateAccountPayableSchema.safeParse(input);
    if (!result.success) {
      return actionError(result.error.issues[0].message);
    }

    const data = result.data;
    const { tenantId } = await getAuthenticatedUser();
    const now = nowISO();

    const col = tenantCollection(tenantId, "accountsPayable");
    const ref = col.doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return actionError("Conta a pagar não encontrada");
    }

    await ref.update({
      ...data,
      updatedAt: now,
    });

    return actionResponse({ id });
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "Erro inesperado");
  }
}

// ---------------------------------------------------------------------------
// deleteAccountPayable
// ---------------------------------------------------------------------------
export async function deleteAccountPayable(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenantId } = await getAuthenticatedUser();

    const col = tenantCollection(tenantId, "accountsPayable");
    const ref = col.doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return actionError("Conta a pagar não encontrada");
    }

    await ref.delete();
    return actionResponse({ id });
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "Erro inesperado");
  }
}

// ---------------------------------------------------------------------------
// createAccountReceivable
// ---------------------------------------------------------------------------
export async function createAccountReceivable(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const result = CreateAccountReceivableSchema.safeParse(input);
    if (!result.success) {
      return actionError(result.error.issues[0].message);
    }

    const data = result.data;
    const { tenantId } = await getAuthenticatedUser();
    const now = nowISO();

    const col = tenantCollection(tenantId, "accountsReceivable");
    const ref = col.doc();
    await ref.set({
      ...data,
      createdAt: now,
      updatedAt: now,
    });

    return actionResponse({ id: ref.id });
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "Erro inesperado");
  }
}

// ---------------------------------------------------------------------------
// updateAccountReceivable
// ---------------------------------------------------------------------------
export async function updateAccountReceivable(
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const result = UpdateAccountReceivableSchema.safeParse(input);
    if (!result.success) {
      return actionError(result.error.issues[0].message);
    }

    const data = result.data;
    const { tenantId } = await getAuthenticatedUser();
    const now = nowISO();

    const col = tenantCollection(tenantId, "accountsReceivable");
    const ref = col.doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return actionError("Conta a receber não encontrada");
    }

    await ref.update({
      ...data,
      updatedAt: now,
    });

    return actionResponse({ id });
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "Erro inesperado");
  }
}

// ---------------------------------------------------------------------------
// deleteAccountReceivable
// ---------------------------------------------------------------------------
export async function deleteAccountReceivable(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenantId } = await getAuthenticatedUser();

    const col = tenantCollection(tenantId, "accountsReceivable");
    const ref = col.doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return actionError("Conta a receber não encontrada");
    }

    await ref.delete();
    return actionResponse({ id });
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "Erro inesperado");
  }
}

// ---------------------------------------------------------------------------
// createCashFlowEntry
// ---------------------------------------------------------------------------
export async function createCashFlowEntry(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const result = CreateCashFlowSchema.safeParse(input);
    if (!result.success) {
      return actionError(result.error.issues[0].message);
    }

    const data = result.data;
    const { tenantId } = await getAuthenticatedUser();
    const now = nowISO();

    const col = tenantCollection(tenantId, "cashFlow");
    const ref = col.doc();
    await ref.set({
      ...data,
      createdAt: now,
      updatedAt: now,
    });

    return actionResponse({ id: ref.id });
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "Erro inesperado");
  }
}

// ---------------------------------------------------------------------------
// listAccountsPayable
// ---------------------------------------------------------------------------
export async function listAccountsPayable(
  filters?: {
    status?: string;
    startDate?: string;
    endDate?: string;
  },
): Promise<ActionResult<Array<{ id: string } & Record<string, unknown>>>> {
  try {
    const { tenantId } = await getAuthenticatedUser();
    let query: FirebaseFirestore.Query = tenantCollection(
      tenantId,
      "accountsPayable",
    );

    if (filters?.status) {
      query = query.where("status", "==", filters.status);
    }
    if (filters?.startDate) {
      query = query.where("dueDate", ">=", filters.startDate);
    }
    if (filters?.endDate) {
      query = query.where("dueDate", "<=", filters.endDate);
    }

    query = query.orderBy("dueDate", "desc").limit(500);

    const snap = await query.get();
    const items = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return actionResponse(items);
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "Erro inesperado");
  }
}

// ---------------------------------------------------------------------------
// listAccountsReceivable
// ---------------------------------------------------------------------------
export async function listAccountsReceivable(
  filters?: {
    status?: string;
    startDate?: string;
    endDate?: string;
  },
): Promise<ActionResult<Array<{ id: string } & Record<string, unknown>>>> {
  try {
    const { tenantId } = await getAuthenticatedUser();
    let query: FirebaseFirestore.Query = tenantCollection(
      tenantId,
      "accountsReceivable",
    );

    if (filters?.status) {
      query = query.where("status", "==", filters.status);
    }
    if (filters?.startDate) {
      query = query.where("dueDate", ">=", filters.startDate);
    }
    if (filters?.endDate) {
      query = query.where("dueDate", "<=", filters.endDate);
    }

    query = query.orderBy("dueDate", "desc").limit(500);

    const snap = await query.get();
    const items = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return actionResponse(items);
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "Erro inesperado");
  }
}

// ---------------------------------------------------------------------------
// listCashFlow
// ---------------------------------------------------------------------------
export async function listCashFlow(
  filters?: {
    type?: string;
    startDate?: string;
    endDate?: string;
  },
): Promise<ActionResult<Array<{ id: string } & Record<string, unknown>>>> {
  try {
    const { tenantId } = await getAuthenticatedUser();
    let query: FirebaseFirestore.Query = tenantCollection(
      tenantId,
      "cashFlow",
    );

    if (filters?.type) {
      query = query.where("type", "==", filters.type);
    }
    if (filters?.startDate) {
      query = query.where("date", ">=", filters.startDate);
    }
    if (filters?.endDate) {
      query = query.where("date", "<=", filters.endDate);
    }

    query = query.orderBy("date", "desc").limit(500);

    const snap = await query.get();
    const items = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return actionResponse(items);
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "Erro inesperado");
  }
}

// ---------------------------------------------------------------------------
// deleteCashFlowEntry
// ---------------------------------------------------------------------------
export async function deleteCashFlowEntry(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenantId } = await getAuthenticatedUser();

    const col = tenantCollection(tenantId, "cashFlow");
    const ref = col.doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return actionError("Lançamento de caixa não encontrado");
    }

    await ref.delete();
    return actionResponse({ id });
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "Erro inesperado");
  }
}
