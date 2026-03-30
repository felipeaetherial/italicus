import { type NextRequest, NextResponse } from "next/server";

const publicPaths = ["/login", "/register", "/reset-password"];

function isPublicPath(pathname: string): boolean {
	return publicPaths.some((path) => pathname.startsWith(path));
}

function isAdminPath(pathname: string): boolean {
	return (
		pathname.startsWith("/dashboard") ||
		pathname.startsWith("/pedidos") ||
		pathname.startsWith("/vendas") ||
		pathname.startsWith("/producao") ||
		pathname.startsWith("/produtos") ||
		pathname.startsWith("/fichas-tecnicas") ||
		pathname.startsWith("/insumos") ||
		pathname.startsWith("/estoque") ||
		pathname.startsWith("/fornecedores") ||
		pathname.startsWith("/clientes") ||
		pathname.startsWith("/financeiro") ||
		pathname.startsWith("/desperdicio") ||
		pathname.startsWith("/relatorios") ||
		pathname.startsWith("/configuracoes")
	);
}

function isB2bPath(pathname: string): boolean {
	return (
		pathname.startsWith("/catalogo") ||
		pathname.startsWith("/meus-pedidos") ||
		pathname.startsWith("/financeiro-b2b")
	);
}

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Allow public paths
	if (isPublicPath(pathname)) {
		return NextResponse.next();
	}

	// Allow API routes and static assets
	if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
		return NextResponse.next();
	}

	// Check for auth session cookie
	const session = request.cookies.get("session");

	if (!session) {
		const loginUrl = new URL("/login", request.url);
		loginUrl.searchParams.set("redirect", pathname);
		return NextResponse.redirect(loginUrl);
	}

	// TODO: Decode session token to check role and tenantId
	// For now, allow all authenticated users through
	// In production, verify the session token and check:
	// - B2B clients trying to access admin routes → redirect to /catalogo
	// - Admin users trying to access B2B routes → redirect to /dashboard

	return NextResponse.next();
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
