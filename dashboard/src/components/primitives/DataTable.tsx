import { type ReactNode } from "react";
import { Card } from "@/components/primitives/Card";

export const TH = "px-3 py-3 text-left font-medium sm:px-6";
export const TH_NUM = "w-24 px-3 py-3 text-right font-medium sm:w-32 sm:px-6";
export const CELL = "px-3 py-3 sm:px-6";
export const CELL_NUM = "px-3 py-3 text-right tabular-nums sm:px-6";

export const WIDE_ONLY = "hidden sm:table-cell";

export const LARGE_ONLY = "hidden lg:table-cell";

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
