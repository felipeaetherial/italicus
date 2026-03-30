"use client";

import { EmptyState } from "./empty-state";

interface Column<T> {
	key: string;
	header: string;
	render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
	columns: Column<T>[];
	data: T[];
	loading?: boolean;
	emptyTitle?: string;
	emptyDescription?: string;
	emptyAction?: React.ReactNode;
}

function SkeletonRow({ cols }: { cols: number }) {
	return (
		<tr>
			{Array.from({ length: cols }).map((_, i) => (
				<td key={`skeleton-${i}`} className="px-4 py-3">
					<div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
				</td>
			))}
		</tr>
	);
}

export function DataTable<T extends { id?: string }>({
	columns,
	data,
	loading,
	emptyTitle = "Nenhum item encontrado",
	emptyDescription,
	emptyAction,
}: DataTableProps<T>) {
	if (!loading && data.length === 0) {
		return (
			<EmptyState
				title={emptyTitle}
				description={emptyDescription}
				action={emptyAction}
			/>
		);
	}

	return (
		<div className="rounded-md border">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b bg-muted/50">
						{columns.map((col) => (
							<th
								key={col.key}
								className="px-4 py-3 text-left font-medium text-muted-foreground"
							>
								{col.header}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{loading
						? Array.from({ length: 5 }).map((_, i) => (
								<SkeletonRow key={`loading-${i}`} cols={columns.length} />
							))
						: data.map((item, i) => (
								<tr key={item.id ?? i} className="border-b last:border-0">
									{columns.map((col) => (
										<td key={col.key} className="px-4 py-3">
											{col.render
												? col.render(item)
												: (item as Record<string, unknown>)[col.key] as React.ReactNode}
										</td>
									))}
								</tr>
							))}
				</tbody>
			</table>
		</div>
	);
}
