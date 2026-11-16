import { useTranslation } from "react-i18next";
import { ChartReadout } from "@/components/primitives";
import { countOrDash, shortDay } from "@/features/owner/owner.utils";
import { cn } from "@/lib/cn";

export interface DayValue {
	/** `YYYY-MM-DD`, UTC. */
	day: string;
	value: number | null;
}

function dayReadout(day: DayValue, also?: { label: string; value: number | undefined }): string {
	const first = `${shortDay(day.day)}: ${countOrDash(day.value)}`;
	return also === undefined ? first : `${first} · ${also.label}: ${countOrDash(also.value)}`;
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
	/** A second figure for each day, given beside the bar's own. */
	also?: { label: string; values: number[] };
	tint?: string;
	tall?: boolean;
}): React.JSX.Element {
	const { t } = useTranslation();
	const max = Math.max(1, ...days.map((day) => day.value ?? 0));

	return (
		<figure className="flex flex-col gap-2">
			<ChartReadout label={caption} column slide className={cn("flex items-end gap-px", tall ? "h-28" : "h-20")}>
				{days.map((day, index) => (
					<span
						key={day.day}
						data-readout={dayReadout(
							day,
							also === undefined ? undefined : { label: also.label, value: also.values[index] },
						)}
						className={cn("min-h-px flex-1 rounded-t-chip", tint)}
						style={{ height: `${String(Math.round(((day.value ?? 0) / max) * 100))}%` }}
					/>
				))}
			</ChartReadout>

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
