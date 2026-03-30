"use server";

import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

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
	tenantId: string;
	role: "owner" | "staff" | "b2b_client";
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
	const cookieStore = await cookies();
	const session = cookieStore.get("session");

	if (!session?.value) {
		throw new Error("Não autenticado");
	}

	const decodedToken = await adminAuth.verifySessionCookie(session.value, true);
	const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();

	if (!userDoc.exists) {
		throw new Error("Usuário não encontrado");
	}

	const userData = userDoc.data()!;
	return {
		userId: decodedToken.uid,
		tenantId: userData.tenantId,
		role: userData.role,
	};
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
