import { Logo } from "@/components/shared/logo";

export default function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-primary p-4">
			<div className="mb-8">
				<Logo size="lg" variant="dark" />
			</div>
			<div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
				{children}
			</div>
		</div>
	);
}
