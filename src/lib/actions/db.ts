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
