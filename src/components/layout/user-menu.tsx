"use client";

import Link from "next/link";
import { useAuth } from "@/lib/providers/auth-provider";
import { Settings, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserMenuProps {
  variant?: "light" | "dark";
}

export function UserMenu({ variant = "light" }: UserMenuProps) {
  const { user, logout } = useAuth();

  if (!user) return null;

  const initial = user.displayName?.charAt(0).toUpperCase() || "U";
  const isDark = variant === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
            isDark
              ? "bg-white/20 text-white hover:bg-white/30"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {initial}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.displayName}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/configuracoes" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => logout()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
