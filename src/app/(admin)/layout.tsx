import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminHeader } from "@/components/layout/admin-header";

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen bg-background">
			<AdminSidebar />
			<div className="lg:pl-64">
				<AdminHeader />
				<main>{children}</main>
			</div>
		</div>
	);
}
