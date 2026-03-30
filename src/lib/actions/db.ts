import { adminDb } from "@/lib/firebase/admin";

export type ActionResult<T> =
	| { success: true; data: T }
	| { success: false; error: string };

export function actionResponse<T>(data: T): ActionResult<T> {
	return { success: true, data };
}

export function actionError<T = never>(message: string): ActionResult<T> {
	return { success: false, error: message };
}

export interface AuthenticatedUser {
	userId: string;
	email: string;
	tenantId: string;
	role: "owner" | "staff" | "b2b_client";
	tenantRole?: "admin" | "user";
	displayName: string;
}

export function nowISO(): string {
	return new Date().toISOString();
}

export function tenantRef(tenantId: string) {
	return adminDb.collection("tenants").doc(tenantId);
}

export function tenantCollection(tenantId: string, collectionName: string) {
	return tenantRef(tenantId).collection(collectionName);
}

export function requireAdmin(user: AuthenticatedUser): void {
	if (user.role !== "owner" && user.role !== "staff") {
		throw new Error("Acesso negado. Apenas administradores.");
	}
}

export function requireB2b(user: AuthenticatedUser): void {
	if (user.role !== "b2b_client") {
		throw new Error("Acesso negado. Apenas clientes B2B.");
	}
}

export function calculateDueDate(
	customerName?: string,
	paymentDueDate?: string,
): string {
	const now = new Date();
	const name = (customerName || "").toLowerCase();

	if (name.includes("parada")) {
		const next = new Date(now.getFullYear(), now.getMonth() + 1, 15);
		return next.toISOString().split("T")[0];
	}

	if (name.includes("campano")) {
		const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
		const nextMonday = new Date(now);
		nextMonday.setDate(now.getDate() + daysUntilMonday);
		return nextMonday.toISOString().split("T")[0];
	}

	return paymentDueDate || now.toISOString().split("T")[0];
}

export function calculateProfitMargin(
	sellPrice: number,
	costPrice: number,
): number {
	if (sellPrice <= 0) return 0;
	return Math.round(((sellPrice - costPrice) / sellPrice) * 100 * 100) / 100;
}

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
		const totalYieldGrams = yieldQty * 1000;
		costPerUnit = (product.weightPerUnit / totalYieldGrams) * totalCost;
	} else if (
		product?.weightPerUnit &&
		product.weightPerUnit > 0 &&
		sheet.totalWeightAfterOven &&
		sheet.totalWeightAfterOven > 0
	) {
		costPerUnit = (product.weightPerUnit / sheet.totalWeightAfterOven) * totalCost;
	} else {
		costPerUnit = totalCost / yieldQty;
	}

	costPerUnit = Math.round(costPerUnit * 100) / 100;
	const profitMargin = calculateProfitMargin(product?.sellPrice ?? 0, costPerUnit);

	return { totalCost, costPerUnit, updatedIngredients, profitMargin };
}
