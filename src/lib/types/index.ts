export type UserRole = "owner" | "staff" | "b2b_client";
export type TenantRole = "admin" | "user";
export type Plan = "free" | "starter" | "pro";

export interface SessionUser {
	uid: string;
	email: string;
	displayName: string;
	role: UserRole;
	tenantId: string;
	tenantRole?: TenantRole;
}

export interface NavItem {
	title: string;
	href: string;
	icon?: React.ComponentType<{ className?: string }>;
	badge?: string;
}

export interface NavGroup {
	label: string;
	items: NavItem[];
}
