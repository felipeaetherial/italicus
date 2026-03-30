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
 * Calculate payment due date based on customer name rules.
 */
export function calculateDueDate(
	customerName?: string,
	paymentDueDate?: string,
): string {
	const now = new Date();
	const name = (customerName || "").toLowerCase();

	if (name.includes("parada")) {
		// Day 15 of next month
		const next = new Date(now.getFullYear(), now.getMonth() + 1, 15);
		return next.toISOString().split("T")[0];
	}

	if (name.includes("campano")) {
		// Next Monday
		const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
		const nextMonday = new Date(now);
		nextMonday.setDate(now.getDate() + daysUntilMonday);
		return nextMonday.toISOString().split("T")[0];
	}

	return paymentDueDate || now.toISOString().split("T")[0];
}

/**
 * Calculate profit margin percentage.
 */
export function calculateProfitMargin(
	sellPrice: number,
	costPrice: number,
): number {
	if (sellPrice <= 0) return 0;
	return Math.round(((sellPrice - costPrice) / sellPrice) * 100 * 100) / 100;
}

/**
 * Recalculate technical sheet costs using current ingredient prices.
 * Returns updated fields for the sheet and the product.
 */
export function calculateSheetCost(
	sheet: {
		yieldQuantity: number;
		yieldUnit?: string;
		totalWeightAfterOven?: number;
		ingredients: {
			ingredientId: string;
			ingredientName: string;
			quantity: number;
			unit: string;
			cost: number;
		}[];
	},
	ingredientPrices: Map<string, number>,
	product?: { unit?: string; weightPerUnit?: number; sellPrice?: number },
): {
	totalCost: number;
	costPerUnit: number;
	updatedIngredients: typeof sheet.ingredients;
	profitMargin: number;
} {
	const updatedIngredients = sheet.ingredients.map((ing) => ({
		...ing,
		cost:
			(ingredientPrices.get(ing.ingredientId) ?? ing.cost / (ing.quantity || 1)) *
			ing.quantity,
	}));

	const totalCost = updatedIngredients.reduce((sum, ing) => sum + ing.cost, 0);

	let costPerUnit: number;
	const yieldQty = sheet.yieldQuantity || 1;

	if (
		sheet.yieldUnit === "kg" &&
		product?.unit === "un" &&
		product?.weightPerUnit &&
		product.weightPerUnit > 0
	) {
		// Yield in kg, product in units with weight: convert
		const totalYieldGrams = yieldQty * 1000;
		costPerUnit = (product.weightPerUnit / totalYieldGrams) * totalCost;
	} else if (
		product?.weightPerUnit &&
		product.weightPerUnit > 0 &&
		sheet.totalWeightAfterOven &&
		sheet.totalWeightAfterOven > 0
	) {
		// Both weights available
		costPerUnit = (product.weightPerUnit / sheet.totalWeightAfterOven) * totalCost;
	} else {
		// Fallback: simple division
		costPerUnit = totalCost / yieldQty;
	}

	costPerUnit = Math.round(costPerUnit * 100) / 100;
	const profitMargin = calculateProfitMargin(product?.sellPrice ?? 0, costPerUnit);

	return { totalCost, costPerUnit, updatedIngredients, profitMargin };
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
