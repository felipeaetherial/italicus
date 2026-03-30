import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
	title: "PaoTech - Gestão para Fábricas de Pães Artesanais",
	description:
		"Sistema de gestão completo para fábricas de pães artesanais. Controle produção, vendas, estoque e financeiro.",
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
			<body className="min-h-full flex flex-col">
				{children}
				<Toaster richColors position="top-right" />
			</body>
		</html>
	);
}
