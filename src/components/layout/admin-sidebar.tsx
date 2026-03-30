"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";

const navGroups = [
	{
		label: "Geral",
		items: [
			{ title: "Dashboard", href: "/dashboard", icon: Home },
			{ title: "Pedidos", href: "/pedidos", icon: ClipboardList },
			{ title: "Relatórios", href: "/relatorios", icon: BarChart3 },
		],
	},
	{
		label: "Vendas & Produtos",
		items: [
			{ title: "Vendas", href: "/vendas", icon: ShoppingCart },
			{ title: "Produtos", href: "/produtos", icon: Package },
			{ title: "Fichas Técnicas", href: "/fichas-tecnicas", icon: BookOpen },
		],
	},
	{
		label: "Estoque & Produção",
		items: [
			{ title: "Produção", href: "/producao", icon: Factory },
			{ title: "Insumos", href: "/insumos", icon: Wheat },
			{ title: "Estoque", href: "/estoque", icon: Box },
			{ title: "Desperdício", href: "/desperdicio", icon: Trash2 },
		],
	},
	{
		label: "Financeiro",
		items: [
			{ title: "Fluxo de Caixa", href: "/financeiro/fluxo-caixa", icon: DollarSign },
			{ title: "Contas a Pagar", href: "/financeiro/contas-pagar", icon: DollarSign },
			{ title: "Contas a Receber", href: "/financeiro/contas-receber", icon: DollarSign },
		],
	},
	{
		label: "Cadastros",
		items: [
			{ title: "Clientes", href: "/clientes", icon: Users },
			{ title: "Fornecedores", href: "/fornecedores", icon: Truck },
			{ title: "Configurações", href: "/configuracoes", icon: Settings },
		],
	},
];

export function AdminSidebar() {
	const pathname = usePathname();

	return (
		<aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
			<div className="flex h-16 items-center justify-center border-b border-sidebar-border px-6">
				<Link href="/dashboard">
					<Logo size="sm" variant="dark" />
				</Link>
			</div>
			<nav className="space-y-1 overflow-y-auto p-4" style={{ height: "calc(100vh - 4rem)" }}>
				{navGroups.map((group) => (
					<div key={group.label} className="py-2">
						<p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
							{group.label}
						</p>
						{group.items.map((item) => {
							const isActive =
								pathname === item.href || pathname.startsWith(`${item.href}/`);
							return (
								<Link
									key={item.href}
									href={item.href}
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
					</div>
				))}
			</nav>
		</aside>
	);
}
