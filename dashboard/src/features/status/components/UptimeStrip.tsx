import { type StatusDay } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { ChartReadout } from "@/components/primitives";
import { dayFill, percent } from "@/features/status/status.utils";
import { cn } from "@/lib/cn";
import { calendarDate } from "@/lib/datetime";

export function UptimeStrip({ days }: { days: StatusDay[] }): React.JSX.Element {
	const { t } = useTranslation();
	const label = (day: StatusDay): string =>
		day.uptime === null ? t("status.noData") : t("status.upFor", { share: percent(day.uptime) });

	return (
		<figure className="flex flex-col gap-2">
			<ChartReadout label={t("status.perDay")} column slide className="flex h-10 items-stretch gap-px">
				{days.map((day) => (
					<span
						key={day.day}
						data-readout={`${calendarDate(day.day)}: ${label(day)}`}
						className={cn("rounded-chip min-w-0 flex-1 opacity-80 hover:opacity-100", dayFill(day.uptime))}
					/>
				))}
			</ChartReadout>

			<div className="text-muted-foreground flex justify-between text-xs" aria-hidden="true">
				<span>{calendarDate(days[0]?.day ?? "")}</span>
				<span>{t("status.today")}</span>
			</div>

			<figcaption className="sr-only">
				<table>
					<caption>{t("status.perDay")}</caption>
					<thead>
						<tr>
							<th scope="col">{t("status.day")}</th>
							<th scope="col">{t("status.uptime")}</th>
						</tr>
					</thead>
					<tbody>
						{days.map((day) => (
							<tr key={day.day}>
								<th scope="row">{calendarDate(day.day)}</th>
								<td>{label(day)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</figcaption>
		</figure>
	);
}
