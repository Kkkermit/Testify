import { type UsageDay } from "@testify/shared";
import { shortDay } from "@/features/owner/owner.utils";

/**
 * Commands per day as a column per day, over a `<table>` rather than a canvas: the numbers are the information
 * and a screen reader gets them. No chart library — a bar is a div with a height.
 */
export function UsageChart({ days }: { days: UsageDay[] }): React.JSX.Element {
	const max = Math.max(1, ...days.map((day) => day.count));

	return (
		<figure className="flex flex-col gap-2">
			<div className="flex h-28 items-end gap-px" aria-hidden="true">
				{days.map((day) => (
					<span
						key={day.day}
						title={`${shortDay(day.day)}: ${day.count.toLocaleString()}`}
						className="bg-primary/30 hover:bg-primary/60 min-h-px flex-1 rounded-t-sm transition-colors duration-150"
						style={{ height: `${String(Math.round((day.count / max) * 100))}%` }}
					/>
				))}
			</div>

			<div className="text-muted-foreground flex justify-between text-xs" aria-hidden="true">
				<span>{shortDay(days[0]?.day ?? "")}</span>
				<span>{shortDay(days.at(-1)?.day ?? "")}</span>
			</div>

			<figcaption className="sr-only">
				<table>
					<caption>Commands run per day</caption>
					<thead>
						<tr>
							<th scope="col">Day</th>
							<th scope="col">Commands</th>
							<th scope="col">Failures</th>
						</tr>
					</thead>
					<tbody>
						{days.map((day) => (
							<tr key={day.day}>
								<th scope="row">{shortDay(day.day)}</th>
								<td>{day.count}</td>
								<td>{day.failures}</td>
							</tr>
						))}
					</tbody>
				</table>
			</figcaption>
		</figure>
	);
}
