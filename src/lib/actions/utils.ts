"use server";

import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { AuthenticatedUser } from "./db";

// Demo user for testing phase (auth disabled)
const DEMO_USER: AuthenticatedUser = {
	userId: "demo-user",
	email: "demo@italicus.com.br",
	tenantId: "demo-tenant",
	role: "owner",
	tenantRole: "admin",
	displayName: "Demo User",
};

export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
	const cookieStore = await cookies();
	const session = cookieStore.get("__session");

	// If no session, return demo user for testing
	if (!session?.value) {
		return DEMO_USER;
	}

	try {
		const decodedToken = await adminAuth.verifySessionCookie(
			session.value,
			true,
		);
		const userDoc = await adminDb
			.collection("users")
			.doc(decodedToken.uid)
			.get();

		if (!userDoc.exists) {
			return DEMO_USER;
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
	} catch {
		// Firebase not configured or session invalid — use demo user
		return DEMO_USER;
	}
}
