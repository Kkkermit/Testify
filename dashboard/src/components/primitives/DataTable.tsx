import { type ReactNode } from "react";
import { Card } from "@/components/primitives/Card";

/**
 * The table shell both boards are drawn with, so a padding or a divider is written once.
 *
 * The cell classes are exported rather than wrapped in `<Td>` components because a table's semantics are the
 * point — `scope`, `<th scope="row">` and the cells a narrow screen drops all belong to the call site.
 */

export const TH = "px-3 py-3 text-left font-medium sm:px-6";
export const TH_NUM = "w-24 px-3 py-3 text-right font-medium sm:w-32 sm:px-6";
export const CELL = "px-3 py-3 sm:px-6";
export const CELL_NUM = "px-3 py-3 text-right font-mono tabular-nums sm:px-6";

/** A column a phone has no room for. The one the board is named after always stays. */
export const WIDE_ONLY = "hidden sm:table-cell";

export function DataTable({
	caption,
	head,
	children,
}: {
	caption: ReactNode;
	head: ReactNode;
	children: ReactNode;
}): React.JSX.Element {
	return (
		<Card padding="none" className="overflow-x-auto">
			<table className="w-full table-fixed text-sm">
				<caption className="sr-only">{caption}</caption>
				<thead className="text-muted-foreground border-border border-b">
					<tr>{head}</tr>
				</thead>
				<tbody className="divide-border divide-y">{children}</tbody>
			</table>
		</Card>
	);
}
