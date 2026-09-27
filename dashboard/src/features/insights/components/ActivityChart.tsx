import { type InsightDay } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { barHeight } from "@/features/insights/insights.utils";
import { shortDate } from "@/lib/datetime";

/** Messages a day as bars; the numbers, joins and leaves included, are a real table for anybody not seeing the bars. */
export function ActivityChart({ days }: { days: InsightDay[] }): React.JSX.Element {
	const { t } = useTranslation();
	const max = Math.max(0, ...days.map((day) => day.messages));

	return (
		<figure className="flex flex-col gap-2">
			<div className="flex h-32 items-end gap-px" aria-hidden="true">
				{days.map((day) => (
					<span
						key={day.day}
						title={`${shortDate(day.day)}: ${day.messages.toLocaleString()}`}
						className="bg-primary/30 hover:bg-primary/60 min-h-px flex-1 rounded-t-chip transition-colors duration-150"
						style={{ height: `${String(barHeight(day.messages, max))}%` }}
					/>
				))}
			</div>
			<div className="text-muted-foreground flex justify-between text-xs" aria-hidden="true">
				<span>{shortDate(days[0]?.day ?? "")}</span>
				<span>{shortDate(days.at(-1)?.day ?? "")}</span>
			</div>
			<figcaption className="sr-only">
				<table>
					<caption>{t("insights.perDay")}</caption>
					<thead>
						<tr>
							<th scope="col">{t("insights.day")}</th>
							<th scope="col">{t("insights.messages")}</th>
							<th scope="col">{t("insights.joined")}</th>
							<th scope="col">{t("insights.left")}</th>
						</tr>
					</thead>
					<tbody>
						{days.map((day) => (
							<tr key={day.day}>
								<th scope="row">{shortDate(day.day)}</th>
								<td>{day.messages}</td>
								<td>{day.joins}</td>
								<td>{day.leaves}</td>
							</tr>
						))}
					</tbody>
				</table>
			</figcaption>
		</figure>
	);
}
