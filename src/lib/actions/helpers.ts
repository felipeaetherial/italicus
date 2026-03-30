"use server";

import { adminDb } from "@/lib/firebase/admin";
import { tenantCollection } from "./db";

/**
 * Debit ingredients from stock based on sale items.
 * For each sold product, finds its technical sheet and debits
 * proportional ingredient quantities.
 */
export async function debitIngredients(
	tenantId: string,
	items: { productId: string; quantity: number }[],
) {
	const batch = adminDb.batch();
	const sheetsCol = tenantCollection(tenantId, "technicalSheets");
	const ingredientsCol = tenantCollection(tenantId, "ingredients");

	for (const item of items) {
		// Find technical sheet for this product
		const sheetsSnap = await sheetsCol
			.where("productId", "==", item.productId)
			.limit(1)
			.get();

		if (sheetsSnap.empty) continue;

		const sheet = sheetsSnap.docs[0].data();
		const recipesNeeded = item.quantity / (sheet.yieldQuantity || 1);

		for (const sheetIngredient of sheet.ingredients || []) {
			const qtyToDebit = sheetIngredient.quantity * recipesNeeded;
			const ingredientRef = ingredientsCol.doc(sheetIngredient.ingredientId);
			const ingredientSnap = await ingredientRef.get();

			if (!ingredientSnap.exists) continue;
			const ingredientData = ingredientSnap.data()!;

			if (ingredientData.trackStock) {
				batch.update(ingredientRef, {
					stockQuantity: Math.max(0, (ingredientData.stockQuantity || 0) - qtyToDebit),
				});
			}
		}
	}

	await batch.commit();
}

/**
 * Revert ingredient stock deductions (inverse of debitIngredients).
 */
export async function revertIngredients(
	tenantId: string,
	items: { productId: string; quantity: number }[],
) {
	const batch = adminDb.batch();
	const sheetsCol = tenantCollection(tenantId, "technicalSheets");
	const ingredientsCol = tenantCollection(tenantId, "ingredients");

	for (const item of items) {
		const sheetsSnap = await sheetsCol
			.where("productId", "==", item.productId)
			.limit(1)
			.get();

		if (sheetsSnap.empty) continue;

		const sheet = sheetsSnap.docs[0].data();
		const recipesNeeded = item.quantity / (sheet.yieldQuantity || 1);

		for (const sheetIngredient of sheet.ingredients || []) {
			const qtyToRevert = sheetIngredient.quantity * recipesNeeded;
			const ingredientRef = ingredientsCol.doc(sheetIngredient.ingredientId);
			const ingredientSnap = await ingredientRef.get();

			if (!ingredientSnap.exists) continue;
			const ingredientData = ingredientSnap.data()!;

			if (ingredientData.trackStock) {
				batch.update(ingredientRef, {
					stockQuantity: (ingredientData.stockQuantity || 0) + qtyToRevert,
				});
			}
		}
	}

	await batch.commit();
}

/**
 * Propagate name change across denormalized fields.
 */
export async function propagateCustomerNameChange(
	tenantId: string,
	customerId: string,
	oldName: string,
	newName: string,
) {
	const batch = adminDb.batch();

	// Update sales
	const salesSnap = await tenantCollection(tenantId, "sales")
		.where("customerId", "==", customerId)
		.get();
	for (const doc of salesSnap.docs) {
		batch.update(doc.ref, { customerName: newName });
	}

	// Update orders
	const ordersSnap = await tenantCollection(tenantId, "orders")
		.where("customerId", "==", customerId)
		.get();
	for (const doc of ordersSnap.docs) {
		batch.update(doc.ref, { customerName: newName });
	}

	// Update accounts receivable
	const arSnap = await tenantCollection(tenantId, "accountsReceivable")
		.where("customerId", "==", customerId)
		.get();
	for (const doc of arSnap.docs) {
		batch.update(doc.ref, { customerName: newName });
	}

	await batch.commit();
}

export async function propagateSupplierNameChange(
	tenantId: string,
	supplierId: string,
	oldName: string,
	newName: string,
) {
	const batch = adminDb.batch();

	// Update ingredients
	const ingredientsSnap = await tenantCollection(tenantId, "ingredients")
		.where("supplierId", "==", supplierId)
		.get();
	for (const doc of ingredientsSnap.docs) {
		batch.update(doc.ref, { supplierName: newName });
	}

	// Update stock entries
	const stockSnap = await tenantCollection(tenantId, "stockEntries")
		.where("supplierId", "==", supplierId)
		.get();
	for (const doc of stockSnap.docs) {
		batch.update(doc.ref, { supplierName: newName });
	}

	// Update accounts payable
	const apSnap = await tenantCollection(tenantId, "accountsPayable")
		.where("supplierId", "==", supplierId)
		.get();
	for (const doc of apSnap.docs) {
		batch.update(doc.ref, { supplierName: newName });
	}

	await batch.commit();
}
