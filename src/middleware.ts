import { type NextRequest, NextResponse } from "next/server";

// AUTH DISABLED FOR TESTING PHASE
// All routes are publicly accessible.
// Re-enable by restoring the auth checks below.

export function middleware(_request: NextRequest) {
	return NextResponse.next();
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
