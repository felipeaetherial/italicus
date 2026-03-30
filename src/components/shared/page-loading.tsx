import { Skeleton } from "@/components/ui/skeleton";

export function PageLoading() {
	return (
		<div className="space-y-6 p-6">
			<div className="flex items-center justify-between">
				<div className="space-y-2">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-4 w-64" />
				</div>
				<Skeleton className="h-10 w-32" />
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={`stat-${i}`} className="h-24 rounded-lg" />
				))}
			</div>
			<Skeleton className="h-64 rounded-lg" />
			<div className="space-y-3">
				{Array.from({ length: 5 }).map((_, i) => (
					<Skeleton key={`row-${i}`} className="h-12 rounded" />
				))}
			</div>
		</div>
	);
}
