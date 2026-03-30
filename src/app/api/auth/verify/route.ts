import { type NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
	try {
		const session = request.cookies.get("__session")?.value;

		if (!session) {
			return NextResponse.json(
				{ authenticated: false, user: null },
				{ status: 200 },
			);
		}

		const decodedToken = await adminAuth.verifySessionCookie(session, true);
		const userDoc = await adminDb
			.collection("users")
			.doc(decodedToken.uid)
			.get();

		if (!userDoc.exists) {
			return NextResponse.json(
				{ authenticated: false, user: null },
				{ status: 200 },
			);
		}

		const userData = userDoc.data()!;

		return NextResponse.json({
			authenticated: true,
			user: {
				userId: decodedToken.uid,
				email: decodedToken.email,
				displayName: userData.displayName,
				role: userData.role,
				tenantId: userData.tenantId,
				tenantRole: userData.tenantRole,
			},
		});
	} catch {
		return NextResponse.json(
			{ authenticated: false, user: null },
			{ status: 200 },
		);
	}
}
