import { Skeleton } from "@/components/ui/skeleton";

export default function B2bLoading() {
	return (
		<div className="space-y-4 p-4">
			<div className="flex gap-2 overflow-hidden">
				{Array.from({ length: 5 }).map((_, i) => (
					<Skeleton key={`cat-${i}`} className="h-8 w-20 shrink-0 rounded-full" />
				))}
			</div>
			<Skeleton className="h-10 rounded-md" />
			<div className="grid grid-cols-2 gap-3">
				{Array.from({ length: 6 }).map((_, i) => (
					<Skeleton key={`prod-${i}`} className="h-40 rounded-lg" />
				))}
			</div>
		</div>
	);
}
