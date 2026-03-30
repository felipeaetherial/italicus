"use server";

import { adminDb } from "@/lib/firebase/admin";
import { CreateSupplierSchema } from "@/lib/db/schemas";
import {
  type ActionResult,
  actionResponse,
  actionError,
  nowISO,
  tenantCollection,
} from "./db";
import { getAuthenticatedUser } from "./utils";
import { propagateSupplierNameChange } from "./helpers";

// ---------------------------------------------------------------------------
// Create Supplier
// ---------------------------------------------------------------------------

export async function createSupplier(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = CreateSupplierSchema.safeParse(input);
    if (!parsed.success) {
      return actionError(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const { tenantId } = await getAuthenticatedUser();
    const now = nowISO();

    const col = tenantCollection(tenantId, "suppliers");
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
      err instanceof Error ? err.message : "Erro ao criar fornecedor",
    );
  }
}

// ---------------------------------------------------------------------------
// Update Supplier
// ---------------------------------------------------------------------------

export async function updateSupplier(
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenantId } = await getAuthenticatedUser();
    const now = nowISO();

    const docRef = tenantCollection(tenantId, "suppliers").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return actionError("Fornecedor não encontrado");
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
      await propagateSupplierNameChange(tenantId, id, oldName, newName);
    }

    return actionResponse({ id });
  } catch (err) {
    return actionError(
      err instanceof Error ? err.message : "Erro ao atualizar fornecedor",
    );
  }
}

// ---------------------------------------------------------------------------
// Delete Supplier
// ---------------------------------------------------------------------------

export async function deleteSupplier(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenantId } = await getAuthenticatedUser();

    // Check for linked stock entries
    const stockSnap = await tenantCollection(tenantId, "stockEntries")
      .where("supplierId", "==", id)
      .limit(1)
      .get();

    if (!stockSnap.empty) {
      return actionError(
        "Fornecedor possui entradas de estoque vinculadas. Não é possível excluir.",
      );
    }

    // Check for linked ingredients
    const ingredientsSnap = await tenantCollection(tenantId, "ingredients")
      .where("supplierId", "==", id)
      .limit(1)
      .get();

    if (!ingredientsSnap.empty) {
      return actionError(
        "Fornecedor possui insumos vinculados. Não é possível excluir.",
      );
    }

    await tenantCollection(tenantId, "suppliers").doc(id).delete();

    return actionResponse({ id });
  } catch (err) {
    return actionError(
      err instanceof Error ? err.message : "Erro ao excluir fornecedor",
    );
  }
}

// ---------------------------------------------------------------------------
// List Suppliers
// ---------------------------------------------------------------------------

export async function listSuppliers(): Promise<ActionResult<unknown[]>> {
  try {
    const { tenantId } = await getAuthenticatedUser();

    const snap = await tenantCollection(tenantId, "suppliers").get();

    const suppliers = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return actionResponse(suppliers);
  } catch (err) {
    return actionError(
      err instanceof Error ? err.message : "Erro ao listar fornecedores",
    );
  }
}
