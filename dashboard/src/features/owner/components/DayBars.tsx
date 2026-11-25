import { useTranslation } from "react-i18next";
import { ChartReadout } from "@/components/primitives";
import { countOrDash, shortDay } from "@/features/owner/owner.utils";
import { cn } from "@/lib/cn";

export interface DayValue {
	/** `YYYY-MM-DD`, UTC. */
	day: string;
	value: number | null;
}

interface Column {
	key: string;
	/** What the column is, as read out and written under the chart's ends. */
	label: string;
	value: number | null;
}

/** Bars side by side, each read out with its label and value, with the figures as a table for a screen reader. */
export function ColumnBars({
	columns,
	caption,
	columnLabel,
	valueLabel,
	also,
	format = countOrDash,
	tint = "bg-primary/30",
	tall = false,
}: {
	columns: Column[];
	caption: string;
	/** The heading of the table's first column: what each bar stands for. */
	columnLabel: string;
	valueLabel: string;
	/** A second figure for each column, given beside the bar's own. */
	also?: { label: string; values: number[] };
	format?: (value: number | null | undefined) => string;
	tint?: string;
	tall?: boolean;
}): React.JSX.Element {
	const max = Math.max(1, ...columns.map((column) => column.value ?? 0));
	const readout = (column: Column, index: number): string => {
		const first = `${column.label}: ${format(column.value)}`;
		return also === undefined ? first : `${first} · ${also.label}: ${format(also.values[index])}`;
	};

	return (
		<figure className="flex flex-col gap-2">
			<ChartReadout label={caption} column slide className={cn("flex items-end gap-px", tall ? "h-28" : "h-20")}>
				{columns.map((column, index) => (
					<span
						key={column.key}
						data-readout={readout(column, index)}
						className={cn("min-h-px flex-1 rounded-t-chip", tint)}
						style={{ height: `${String(Math.round(((column.value ?? 0) / max) * 100))}%` }}
					/>
				))}
			</ChartReadout>

			<div className="text-muted-foreground flex justify-between text-xs" aria-hidden="true">
				<span>{columns[0]?.label ?? ""}</span>
				<span>{columns.at(-1)?.label ?? ""}</span>
			</div>

			<figcaption className="sr-only">
				<table>
					<caption>{caption}</caption>
					<thead>
						<tr>
							<th scope="col">{columnLabel}</th>
							<th scope="col">{valueLabel}</th>
							{also !== undefined && <th scope="col">{also.label}</th>}
						</tr>
					</thead>
					<tbody>
						{columns.map((column, index) => (
							<tr key={column.key}>
								<th scope="row">{column.label}</th>
								<td>{format(column.value)}</td>
								{also !== undefined && <td>{format(also.values[index])}</td>}
							</tr>
						))}
					</tbody>
				</table>
			</figcaption>
		</figure>
	);
}

export function DayBars({
	days,
	...chart
}: {
	days: DayValue[];
	caption: string;
	valueLabel: string;
	also?: { label: string; values: number[] };
	format?: (value: number | null | undefined) => string;
	tint?: string;
	tall?: boolean;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<ColumnBars
			{...chart}
			columnLabel={t("owner.day")}
			columns={days.map((day) => ({ key: day.day, label: shortDay(day.day), value: day.value }))}
		/>
	);
}
