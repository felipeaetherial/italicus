"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, DollarSign, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";

const b2bNav = [
	{ title: "Catálogo", href: "/catalogo", icon: ShoppingBag },
	{ title: "Meus Pedidos", href: "/meus-pedidos", icon: ClipboardList },
	{ title: "Financeiro", href: "/financeiro", icon: DollarSign },
];

export default function B2bLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();

	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<header className="sticky top-0 z-20 border-b bg-primary px-4 py-3">
				<div className="mx-auto flex max-w-lg items-center justify-center">
					<Logo size="sm" variant="dark" />
				</div>
			</header>

			{/* Content */}
			<main className="mx-auto max-w-lg pb-20">{children}</main>

			{/* Bottom nav (mobile-first) */}
			<nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-background">
				<div className="mx-auto flex max-w-lg justify-around">
					{b2bNav.map((item) => {
						const isActive =
							pathname === item.href || pathname.startsWith(`${item.href}/`);
						return (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									"flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors",
									isActive
										? "text-gold font-medium"
										: "text-muted-foreground",
								)}
							>
								<item.icon className="h-5 w-5" />
								{item.title}
							</Link>
						);
					})}
				</div>
			</nav>
		</div>
	);
}
