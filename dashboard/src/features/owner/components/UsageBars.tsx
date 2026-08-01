import { BarChart3 } from "lucide-react";
import { type ReactNode } from "react";
import { EmptyState } from "@/components/primitives";
import { barWidth } from "@/features/owner/owner.utils";

export interface BarRow {
	id: string;
	label: ReactNode;
	/** Sits under the label — a category, a member count, whatever names the row further. */
	sub?: string;
	count: number;
}

/**
 * A ranked list with the bar behind the row rather than beside it, so the label is never squeezed by the value.
 *
 * Hand-rolled: a chart library is the single easiest way to double this bundle, and a horizontal bar is a div
 * with a width.
 */
export function UsageBars({
	rows,
	empty,
	tint = "bg-primary/25",
}: {
	rows: BarRow[];
	empty: string;
	tint?: string;
}): React.JSX.Element {
	if (rows.length === 0) return <EmptyState icon={<BarChart3 size={20} />} title="Nothing yet" body={empty} />;

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
