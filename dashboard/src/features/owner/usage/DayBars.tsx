import { shortDay } from "@/features/owner/owner.utils";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/intl";

export interface DayValue {
	/** `YYYY-MM-DD`, UTC. */
	day: string;
	value: number | null;
}

/** One bar a day, oldest first, with the numbers behind it in a table for a screen reader. */
export function DayBars({
	days,
	caption,
	valueLabel,
	tint = "bg-primary/30",
}: {
	days: DayValue[];
	caption: string;
	valueLabel: string;
	tint?: string;
}): React.JSX.Element {
	const max = Math.max(1, ...days.map((day) => day.value ?? 0));

	return (
		<figure className="flex flex-col gap-2">
			<div className="flex h-20 items-end gap-px" aria-hidden="true">
				{days.map((day) => (
					<span
						key={day.day}
						title={`${shortDay(day.day)}: ${day.value === null ? "–" : formatNumber(day.value)}`}
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
					<tbody>
						{days.map((day) => (
							<tr key={day.day}>
								<th scope="row">{shortDay(day.day)}</th>
								<td>
									{valueLabel} {day.value === null ? "–" : formatNumber(day.value)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</figcaption>
		</figure>
	);
}
