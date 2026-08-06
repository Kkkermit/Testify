import { BarChart3 } from "lucide-react";
import { type ReactNode } from "react";
import { barWidth } from "@/features/owner/owner.utils";

export interface BarRow {
	id: string;
	label: ReactNode;
	/** Sits under the label — a category, a member count, whatever names the row further. */
	sub?: string;
	count: number;
}

/** The bar sits behind the row rather than beside it, so the label is never squeezed by the value. */
export function UsageBars({
	rows,
	empty,
	tint = "bg-primary/25",
}: {
	rows: BarRow[];
	empty: string;
	tint?: string;
}): React.JSX.Element {
	// A full EmptyState here is 200px of nothing beside a list of ten, which is the "massive gap" it looks like.
	if (rows.length === 0) {
		return (
			<p className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
				<BarChart3 size={16} aria-hidden="true" className="shrink-0" />
				{empty}
			</p>
		);
	}

	const max = Math.max(...rows.map((row) => row.count));

	return (
		<ol className="flex flex-col gap-1">
			{rows.map((row) => (
				<li key={row.id} className="relative isolate flex items-center gap-3 rounded-lg px-2 py-1.5">
					<span
						aria-hidden="true"
						className={`absolute inset-y-0 left-0 -z-10 rounded-lg transition-[width] duration-500 ${tint}`}
						style={{ width: `${String(barWidth(row.count, max))}%` }}
					/>
					<span className="min-w-0 flex-1">
						<span className="block truncate text-sm font-medium">{row.label}</span>
						{row.sub !== undefined && <span className="text-muted-foreground block truncate text-xs">{row.sub}</span>}
					</span>
					<span className="shrink-0 font-mono text-sm tabular-nums">{row.count.toLocaleString()}</span>
				</li>
			))}
		</ol>
	);
}
