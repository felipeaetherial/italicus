import { type NextRequest, NextResponse } from "next/server";

const publicPaths = ["/login", "/register", "/reset-password"];

function isPublicPath(pathname: string): boolean {
	return publicPaths.some((path) => pathname.startsWith(path));
}

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Allow public paths
	if (isPublicPath(pathname)) {
		return NextResponse.next();
	}

	// Allow API routes and static assets
	if (
		pathname.startsWith("/api") ||
		pathname.startsWith("/_next") ||
		pathname.startsWith("/favicon")
	) {
		return NextResponse.next();
	}

	// TODO: Check for auth session cookie when Firebase Auth is wired up
	// For now, allow all requests through so the app is navigable
	return NextResponse.next();
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
