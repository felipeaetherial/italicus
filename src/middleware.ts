import { type NextRequest, NextResponse } from "next/server";

const publicPaths = ["/login", "/register", "/reset-password"];

const adminPaths = [
	"/dashboard",
	"/pedidos",
	"/vendas",
	"/producao",
	"/produtos",
	"/fichas-tecnicas",
	"/insumos",
	"/estoque",
	"/fornecedores",
	"/clientes",
	"/financeiro",
	"/desperdicio",
	"/relatorios",
	"/configuracoes",
	"/onboarding",
];

const b2bPaths = ["/catalogo", "/meus-pedidos"];

function isPublicPath(pathname: string): boolean {
	return publicPaths.some((path) => pathname.startsWith(path));
}

function isAdminPath(pathname: string): boolean {
	return adminPaths.some((path) => pathname.startsWith(path));
}

function isB2bPath(pathname: string): boolean {
	// /financeiro under b2b is tricky since admin also has /financeiro/*
	// B2B financeiro is just /financeiro (no sub-path) when accessed from b2b layout
	return b2bPaths.some((path) => pathname.startsWith(path));
}

/**
 * Decode a Firebase session cookie JWT without verification (Edge Runtime compatible).
 * Full verification happens in server actions via Admin SDK.
 */
function decodeSessionCookie(
	cookie: string,
): { uid: string; email?: string } | null {
	try {
		const parts = cookie.split(".");
		if (parts.length !== 3) return null;
		const payload = JSON.parse(
			Buffer.from(parts[1], "base64url").toString("utf-8"),
		);
		// Check expiry
		if (payload.exp && payload.exp * 1000 < Date.now()) return null;
		return {
			uid: payload.sub || payload.user_id,
			email: payload.email,
		};
	} catch {
		return null;
	}
}

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Allow public paths
	if (isPublicPath(pathname)) {
		const session = request.cookies.get("__session")?.value;
		if (session) {
			const decoded = decodeSessionCookie(session);
			if (decoded) {
				// Already authenticated, redirect away from auth pages
				return NextResponse.redirect(new URL("/dashboard", request.url));
			}
		}
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

	// Check for session cookie
	const session = request.cookies.get("__session")?.value;

	if (!session) {
		const loginUrl = new URL("/login", request.url);
		loginUrl.searchParams.set("redirect", pathname);
		return NextResponse.redirect(loginUrl);
	}

	const decoded = decodeSessionCookie(session);
	if (!decoded) {
		// Invalid/expired cookie — clear it and redirect to login
		const loginUrl = new URL("/login", request.url);
		const response = NextResponse.redirect(loginUrl);
		response.cookies.set("__session", "", { maxAge: 0, path: "/" });
		return response;
	}

	// Set user ID header for server components
	const response = NextResponse.next();
	response.headers.set("x-user-id", decoded.uid);

	return response;
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
