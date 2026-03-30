import { type NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

const SESSION_EXPIRY = 60 * 60 * 24 * 14 * 1000; // 14 days

export async function POST(request: NextRequest) {
	try {
		const { idToken } = await request.json();

		if (!idToken || typeof idToken !== "string") {
			return NextResponse.json(
				{ error: "Token não fornecido" },
				{ status: 400 },
			);
		}

		// Verify the ID token
		const decodedToken = await adminAuth.verifyIdToken(idToken);

		// Check that the token was issued recently (within 5 minutes)
		const issuedAt = decodedToken.iat * 1000;
		if (Date.now() - issuedAt > 5 * 60 * 1000) {
			return NextResponse.json(
				{ error: "Token expirado. Faça login novamente." },
				{ status: 401 },
			);
		}

		// Create session cookie
		const sessionCookie = await adminAuth.createSessionCookie(idToken, {
			expiresIn: SESSION_EXPIRY,
		});

		// Get user data from Firestore
		const userDoc = await adminDb
			.collection("users")
			.doc(decodedToken.uid)
			.get();
		const userData = userDoc.exists ? userDoc.data() : null;

		const response = NextResponse.json({
			success: true,
			user: userData
				? {
						userId: decodedToken.uid,
						email: decodedToken.email,
						displayName: userData.displayName,
						role: userData.role,
						tenantId: userData.tenantId,
						tenantRole: userData.tenantRole,
					}
				: null,
		});

		response.cookies.set("__session", sessionCookie, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			maxAge: SESSION_EXPIRY / 1000,
		});

		return response;
	} catch (error) {
		console.error("Session creation error:", error);
		return NextResponse.json(
			{ error: "Falha ao criar sessão" },
			{ status: 401 },
		);
	}
}

export async function DELETE() {
	const response = NextResponse.json({ success: true });
	response.cookies.set("__session", "", {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: 0,
	});
	return response;
}
