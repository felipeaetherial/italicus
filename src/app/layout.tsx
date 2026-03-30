import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/providers/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
	title: "PaoTech - Gestão para Fábricas de Pães Artesanais",
	description:
		"Sistema de gestão completo para fábricas de pães artesanais. Controle produção, vendas, estoque e financeiro.",
	manifest: "/manifest.json",
	themeColor: "#D4AF37",
	appleWebApp: {
		capable: true,
		statusBarStyle: "black-translucent",
		title: "PaoTech",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="pt-BR"
			className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
		>
			<head>
				<meta name="apple-mobile-web-app-capable" content="yes" />
			</head>
			<body className="min-h-full flex flex-col">
				<AuthProvider>
					{children}
					<Toaster richColors position="top-right" />
				</AuthProvider>
			</body>
		</html>
	);
}
