import { useTranslation } from "react-i18next";
import { countOrDash, shortDay } from "@/features/owner/owner.utils";
import { cn } from "@/lib/cn";

export interface DayValue {
	/** `YYYY-MM-DD`, UTC. */
	day: string;
	value: number | null;
}

export function DayBars({
	days,
	caption,
	valueLabel,
	also,
	tint = "bg-primary/30",
	tall = false,
}: {
	days: DayValue[];
	caption: string;
	valueLabel: string;
	/** A second figure for each day, read out beside the bars' own in the table. */
	also?: { label: string; values: number[] };
	tint?: string;
	tall?: boolean;
}): React.JSX.Element {
	const { t } = useTranslation();
	const max = Math.max(1, ...days.map((day) => day.value ?? 0));

	return (
		<figure className="flex flex-col gap-2">
			<div className={cn("flex items-end gap-px", tall ? "h-28" : "h-20")} aria-hidden="true">
				{days.map((day) => (
					<span
						key={day.day}
						title={`${shortDay(day.day)}: ${countOrDash(day.value)}`}
						className={cn("min-h-px flex-1 rounded-t-chip", tint)}
						style={{ height: `${String(Math.round(((day.value ?? 0) / max) * 100))}%` }}
					/>
				))}
			</div>

			<div className="text-muted-foreground flex justify-between text-xs" aria-hidden="true">
				<span>{shortDay(days[0]?.day ?? "")}</span>
				<span>{shortDay(days.at(-1)?.day ?? "")}</span>
			</div>

			<figcaption className="sr-only">
				<table>
					<caption>{caption}</caption>
					<thead>
						<tr>
							<th scope="col">{t("owner.day")}</th>
							<th scope="col">{valueLabel}</th>
							{also !== undefined && <th scope="col">{also.label}</th>}
						</tr>
					</thead>
					<tbody>
						{days.map((day, index) => (
							<tr key={day.day}>
								<th scope="row">{shortDay(day.day)}</th>
								<td>{countOrDash(day.value)}</td>
								{also !== undefined && <td>{countOrDash(also.values[index])}</td>}
							</tr>
						))}
					</tbody>
				</table>
			</figcaption>
		</figure>
	);
}
