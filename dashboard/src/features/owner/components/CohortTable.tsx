import { useTranslation } from "react-i18next";
import { shortDay } from "@/features/owner/owner.utils";

const COLUMNS = 8;

export interface CohortRow {
	cohort: string;
	size: number;
	/** What each later period holds, already worded: a share of `size` or a count. */
	cells: string[];
}

/** Cohorts by the day or week they started, and what became of them in each period after. */
export function CohortTable({
	caption,
	sizeLabel,
	periodLabel,
	rows,
	empty,
}: {
	caption: string;
	sizeLabel: string;
	periodLabel: (period: number) => string;
	rows: CohortRow[];
	empty: string;
}): React.JSX.Element {
	const { t } = useTranslation();
	const longest = Math.max(0, ...rows.map((row) => row.cells.length));
	const periods = Array.from({ length: Math.min(COLUMNS, longest) }, (_, index) => index + 1);

	if (rows.length === 0) return <p className="text-muted-foreground text-sm">{empty}</p>;

	return (
		<div className="overflow-x-auto">
			<table className="w-full min-w-[32rem] text-sm tabular-nums">
				<caption className="sr-only">{caption}</caption>
				<thead className="text-muted-foreground text-xs">
					<tr>
						<th scope="col" className="py-1 text-left font-medium">
							{t("owner.usageSections.cohort")}
						</th>
						<th scope="col" className="py-1 text-right font-medium">
							{sizeLabel}
						</th>
						{periods.map((period) => (
							<th key={period} scope="col" className="py-1 text-right font-medium">
								{periodLabel(period)}
							</th>
						))}
					</tr>
				</thead>
				<tbody className="divide-border divide-y">
					{rows.map((row) => (
						<tr key={row.cohort}>
							<th scope="row" className="py-1.5 text-left font-normal">
								{shortDay(row.cohort)}
							</th>
							<td className="py-1.5 text-right">{row.size}</td>
							{periods.map((period) => (
								<td key={period} className="py-1.5 text-right">
									{row.cells[period - 1] ?? ""}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
