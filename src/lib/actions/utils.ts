"use server";

import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { AuthenticatedUser } from "./db";

export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
	const cookieStore = await cookies();
	const session = cookieStore.get("__session");

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
		email: decodedToken.email || "",
		tenantId: userData.tenantId,
		role: userData.role,
		tenantRole: userData.tenantRole,
		displayName: userData.displayName,
	};
}
