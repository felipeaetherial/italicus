"use server";

import { adminDb } from "@/lib/firebase/admin";
import { CreateCustomerSchema } from "@/lib/db/schemas";
import {
  type ActionResult,
  actionResponse,
  actionError,
  nowISO,
  tenantCollection,
} from "./db";
import { getAuthenticatedUser } from "./utils";
import { propagateCustomerNameChange } from "./helpers";

// ---------------------------------------------------------------------------
// Create Customer
// ---------------------------------------------------------------------------

export async function createCustomer(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = CreateCustomerSchema.safeParse(input);
    if (!parsed.success) {
      return actionError(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const { tenantId } = await getAuthenticatedUser();
    const now = nowISO();

    const col = tenantCollection(tenantId, "customers");
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
      err instanceof Error ? err.message : "Erro ao criar cliente",
    );
  }
}

// ---------------------------------------------------------------------------
// Update Customer
// ---------------------------------------------------------------------------

export async function updateCustomer(
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenantId } = await getAuthenticatedUser();
    const now = nowISO();

    const docRef = tenantCollection(tenantId, "customers").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return actionError("Cliente não encontrado");
    }

    const oldData = docSnap.data()!;
    const oldName = oldData.name as string;

    await docRef.update({
      ...(input as Record<string, unknown>),
      updatedAt: now,
    });

    const newName = (input as Record<string, unknown>).name as
      | string
      | undefined;

    if (newName && newName !== oldName) {
      await propagateCustomerNameChange(tenantId, id, oldName, newName);
    }

    return actionResponse({ id });
  } catch (err) {
    return actionError(
      err instanceof Error ? err.message : "Erro ao atualizar cliente",
    );
  }
}

// ---------------------------------------------------------------------------
// Delete Customer
// ---------------------------------------------------------------------------

export async function deleteCustomer(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenantId } = await getAuthenticatedUser();

    // Check for linked sales
    const salesSnap = await tenantCollection(tenantId, "sales")
      .where("customerId", "==", id)
      .limit(1)
      .get();

    if (!salesSnap.empty) {
      return actionError(
        "Cliente possui vendas vinculadas. Não é possível excluir.",
      );
    }

    // Check for linked accounts receivable
    const arSnap = await tenantCollection(tenantId, "accountsReceivable")
      .where("customerId", "==", id)
      .limit(1)
      .get();

    if (!arSnap.empty) {
      return actionError(
        "Cliente possui contas a receber vinculadas. Não é possível excluir.",
      );
    }

    await tenantCollection(tenantId, "customers").doc(id).delete();

    return actionResponse({ id });
  } catch (err) {
    return actionError(
      err instanceof Error ? err.message : "Erro ao excluir cliente",
    );
  }
}

// ---------------------------------------------------------------------------
// List Customers
// ---------------------------------------------------------------------------

export async function listCustomers(): Promise<ActionResult<unknown[]>> {
  try {
    const { tenantId } = await getAuthenticatedUser();

    const snap = await tenantCollection(tenantId, "customers").get();

    const customers = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return actionResponse(customers);
  } catch (err) {
    return actionError(
      err instanceof Error ? err.message : "Erro ao listar clientes",
    );
  }
}
