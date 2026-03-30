import { cn } from "@/lib/utils";

interface StatCardProps {
	label: string;
	value: string | number;
	icon?: React.ReactNode;
	trend?: {
		value: number;
		isPositive: boolean;
	};
	className?: string;
}

export function StatCard({ label, value, icon, trend, className }: StatCardProps) {
	return (
		<div className={cn("rounded-lg border bg-card p-6 shadow-sm", className)}>
			<div className="flex items-center justify-between">
				<p className="text-sm font-medium text-muted-foreground">{label}</p>
				{icon && <div className="text-muted-foreground">{icon}</div>}
			</div>
			<div className="mt-2 flex items-baseline gap-2">
				<p className="text-2xl font-bold">{value}</p>
				{trend && (
					<span
						className={cn(
							"text-xs font-medium",
							trend.isPositive ? "text-green-600" : "text-red-600",
						)}
					>
						{trend.isPositive ? "+" : ""}
						{trend.value}%
					</span>
				)}
			</div>
		</div>
	);
}
