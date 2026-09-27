import { busiestHour } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { barHeight, hourLabel } from "@/features/insights/insights.utils";

export function HoursChart({ hours }: { hours: number[] }): React.JSX.Element {
	const { t } = useTranslation();
	const max = Math.max(0, ...hours);
	const busiest = busiestHour(hours);

	return (
		<figure className="flex flex-col gap-3">
			<p className="text-sm">
				{busiest === null ? t("insights.noBusiestHour") : t("insights.busiestHour", { hour: hourLabel(busiest) })}
			</p>
			<div className="flex h-20 items-end gap-px" aria-hidden="true">
				{hours.map((count, hour) => (
					<span
						key={hour}
						title={`${hourLabel(hour)}: ${count.toLocaleString()}`}
						className={`min-h-px flex-1 rounded-t-chip ${hour === busiest ? "bg-primary/70" : "bg-primary/25"}`}
						style={{ height: `${String(barHeight(count, max))}%` }}
					/>
				))}
			</div>
			<div className="text-muted-foreground flex justify-between text-xs" aria-hidden="true">
				<span>{hourLabel(0)}</span>
				<span>{hourLabel(12)}</span>
				<span>{hourLabel(23)}</span>
			</div>
			<figcaption className="sr-only">
				<table>
					<caption>{t("insights.perHour")}</caption>
					<tbody>
						{hours.map((count, hour) => (
							<tr key={hour}>
								<th scope="row">{hourLabel(hour)}</th>
								<td>{count}</td>
							</tr>
						))}
					</tbody>
				</table>
			</figcaption>
		</figure>
	);
}
