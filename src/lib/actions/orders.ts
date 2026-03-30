"use server";

import { adminDb } from "@/lib/firebase/admin";
import {
	type ActionResult,
	actionResponse,
	actionError,
	getAuthenticatedUser,
	nowISO,
	tenantCollection,
} from "./utils";
import { debitIngredients } from "./helpers";

export async function completeOrder(
	orderId: string,
): Promise<ActionResult<{ id: string }>> {
	try {
		const { tenantId } = await getAuthenticatedUser();
		const orderRef = tenantCollection(tenantId, "orders").doc(orderId);
		const orderSnap = await orderRef.get();

		if (!orderSnap.exists) {
			return actionError("Pedido não encontrado");
		}

		const order = orderSnap.data()!;

		await debitIngredients(tenantId, order.items);

		await orderRef.update({
			status: "entregue",
			updatedAt: nowISO(),
		});

		return actionResponse({ id: orderId });
	} catch (error) {
		return actionError(
			error instanceof Error ? error.message : "Erro ao completar pedido",
		);
	}
}

export async function updateOrderQuantities(input: {
	orderId: string;
	items: {
		productId: string;
		productName: string;
		quantity: number;
		unitPrice: number;
		total: number;
	}[];
}): Promise<ActionResult<{ id: string }>> {
	try {
		const { tenantId } = await getAuthenticatedUser();
		const orderRef = tenantCollection(tenantId, "orders").doc(input.orderId);
		const orderSnap = await orderRef.get();

		if (!orderSnap.exists) {
			return actionError("Pedido não encontrado");
		}

		const order = orderSnap.data()!;

		const itemsTotal = input.items.reduce((sum, item) => sum + item.total, 0);
		const totalAmount = itemsTotal + (order.freightValue || 0);

		const batch = adminDb.batch();

		batch.update(orderRef, {
			items: input.items,
			totalAmount,
			updatedAt: nowISO(),
		});

		// Find linked sale
		let saleId: string | null = order.saleId || null;
		let saleRef: FirebaseFirestore.DocumentReference | null = null;

		if (saleId) {
			const saleDoc = tenantCollection(tenantId, "sales").doc(saleId);
			const saleSnap = await saleDoc.get();
			if (saleSnap.exists) {
				saleRef = saleDoc;
			}
		}

		if (!saleRef) {
			// Fallback: query by customerId + productionDate
			const salesSnap = await tenantCollection(tenantId, "sales")
				.where("customerId", "==", order.customerId)
				.where("productionDate", "==", order.productionDate)
				.limit(1)
				.get();

			if (!salesSnap.empty) {
				saleRef = salesSnap.docs[0].ref;
				saleId = salesSnap.docs[0].id;
			}
		}

		if (saleRef) {
			batch.update(saleRef, {
				items: input.items,
				totalAmount,
				updatedAt: nowISO(),
			});

			// Find linked AccountReceivable
			const arSnap = await tenantCollection(tenantId, "accountsReceivable")
				.where("referenceId", "==", saleId)
				.limit(1)
				.get();

			if (!arSnap.empty) {
				batch.update(arSnap.docs[0].ref, {
					amount: totalAmount,
					updatedAt: nowISO(),
				});
			}
		}

		await batch.commit();

		return actionResponse({ id: input.orderId });
	} catch (error) {
		return actionError(
			error instanceof Error
				? error.message
				: "Erro ao atualizar quantidades do pedido",
		);
	}
}

export async function updateOrderStatus(
	orderId: string,
	status: "pendente" | "confirmado" | "em_producao" | "entregue" | "cancelado",
): Promise<ActionResult<{ id: string }>> {
	try {
		const { tenantId } = await getAuthenticatedUser();
		const orderRef = tenantCollection(tenantId, "orders").doc(orderId);

		await orderRef.update({
			status,
			updatedAt: nowISO(),
		});

		return actionResponse({ id: orderId });
	} catch (error) {
		return actionError(
			error instanceof Error
				? error.message
				: "Erro ao atualizar status do pedido",
		);
	}
}

export async function deleteOrder(
	orderId: string,
): Promise<ActionResult<{ id: string }>> {
	try {
		const { tenantId } = await getAuthenticatedUser();
		const orderRef = tenantCollection(tenantId, "orders").doc(orderId);
		const orderSnap = await orderRef.get();

		if (!orderSnap.exists) {
			return actionError("Pedido não encontrado");
		}

		const order = orderSnap.data()!;
		const batch = adminDb.batch();

		if (order.saleId) {
			const saleRef = tenantCollection(tenantId, "sales").doc(order.saleId);
			const saleSnap = await saleRef.get();

			if (saleSnap.exists) {
				batch.update(saleRef, {
					orderId: null,
					updatedAt: nowISO(),
				});
			}
		}

		batch.delete(orderRef);

		await batch.commit();

		return actionResponse({ id: orderId });
	} catch (error) {
		return actionError(
			error instanceof Error ? error.message : "Erro ao excluir pedido",
		);
	}
}
