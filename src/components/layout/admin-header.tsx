"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo, LogoIcon } from "@/components/shared/logo";
import {
	BarChart3,
	BookOpen,
	Box,
	ClipboardList,
	DollarSign,
	Factory,
	Home,
	Package,
	Settings,
	ShoppingCart,
	Trash2,
	Truck,
	Users,
	Wheat,
} from "lucide-react";

const allNavItems = [
	{ title: "Dashboard", href: "/dashboard", icon: Home },
	{ title: "Pedidos", href: "/pedidos", icon: ClipboardList },
	{ title: "Vendas", href: "/vendas", icon: ShoppingCart },
	{ title: "Produção", href: "/producao", icon: Factory },
	{ title: "Produtos", href: "/produtos", icon: Package },
	{ title: "Fichas Técnicas", href: "/fichas-tecnicas", icon: BookOpen },
	{ title: "Insumos", href: "/insumos", icon: Wheat },
	{ title: "Estoque", href: "/estoque", icon: Box },
	{ title: "Fornecedores", href: "/fornecedores", icon: Truck },
	{ title: "Clientes", href: "/clientes", icon: Users },
	{ title: "Fluxo de Caixa", href: "/financeiro/fluxo-caixa", icon: DollarSign },
	{ title: "Contas a Pagar", href: "/financeiro/contas-pagar", icon: DollarSign },
	{ title: "Contas a Receber", href: "/financeiro/contas-receber", icon: DollarSign },
	{ title: "Desperdício", href: "/desperdicio", icon: Trash2 },
	{ title: "Relatórios", href: "/relatorios", icon: BarChart3 },
	{ title: "Configurações", href: "/configuracoes", icon: Settings },
];

export function AdminHeader() {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const pathname = usePathname();

	return (
		<>
			<header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background px-4 lg:px-6">
				<button
					type="button"
					className="rounded-md p-2 lg:hidden"
					onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
				>
					<Menu className="h-5 w-5" />
				</button>
				<div className="lg:hidden">
					<LogoIcon variant="light" />
				</div>
				<div className="ml-auto flex items-center gap-4">
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
						U
					</div>
				</div>
			</header>

			{/* Mobile menu */}
			{mobileMenuOpen && (
				<div className="fixed inset-0 z-40 lg:hidden">
					<div
						className="fixed inset-0 bg-black/60"
						onClick={() => setMobileMenuOpen(false)}
						onKeyDown={() => {}}
						role="presentation"
					/>
					<div className="fixed inset-y-0 left-0 w-64 bg-sidebar p-4 shadow-lg">
						<div className="mb-6 flex items-center justify-center px-3 py-2">
							<Logo size="sm" variant="dark" />
						</div>
						<nav className="space-y-1">
							{allNavItems.map((item) => {
								const isActive =
									pathname === item.href || pathname.startsWith(`${item.href}/`);
								return (
									<Link
										key={item.href}
										href={item.href}
										onClick={() => setMobileMenuOpen(false)}
										className={cn(
											"flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
											isActive
												? "bg-sidebar-accent text-gold"
												: "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
										)}
									>
										<item.icon className="h-4 w-4" />
										{item.title}
									</Link>
								);
							})}
						</nav>
					</div>
				</div>
			)}
		</>
	);
}
