import { type AudienceReport } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { ChartReadout } from "@/components/primitives";
import { heatLevel } from "@/features/owner/usage/usage.utils";
import { cn } from "@/lib/cn";
import { weekdayName } from "@/lib/datetime";
import { formatNumber } from "@/lib/intl";

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MARKED = new Set([0, 6, 12, 18]);

const LEVELS = ["bg-muted", "bg-primary/20", "bg-primary/40", "bg-primary/65", "bg-primary"];

export function HourHeatmap({ hours }: { hours: AudienceReport["hours"] }): React.JSX.Element {
	const { t } = useTranslation();
	const counts = new Map(hours.cells.map((cell) => [`${String(cell.weekday)}:${String(cell.hour)}`, cell.count]));
	const countAt = (weekday: number, hour: number): number => counts.get(`${String(weekday)}:${String(hour)}`) ?? 0;
	const max = Math.max(0, ...hours.cells.map((cell) => cell.count));

	return (
		<figure className="flex flex-col gap-2">
			<ChartReadout
				label={t("owner.usageSections.hours")}
				columns={HOURS.length}
				slide
				className="grid grid-cols-[3rem_repeat(24,minmax(0,1fr))] gap-px text-xs"
			>
				{WEEKDAYS.map((weekday) => (
					<div key={weekday} className="contents">
						<span className="text-muted-foreground self-center">{weekdayName(weekday)}</span>
						{HOURS.map((hour) => (
							<span
								key={hour}
								data-readout={`${weekdayName(weekday)} ${String(hour).padStart(2, "0")}:00 · ${formatNumber(countAt(weekday, hour))}`}
								className={cn("h-5 rounded-chip", LEVELS[heatLevel(countAt(weekday, hour), max)])}
							/>
						))}
					</div>
				))}
				<span />
				{HOURS.map((hour) => (
					<span key={hour} className="text-muted-foreground text-center whitespace-nowrap">
						{MARKED.has(hour) ? formatNumber(hour) : ""}
					</span>
				))}
			</ChartReadout>

			<p className="text-muted-foreground text-xs">{t("owner.usageSections.hoursZone", { zone: hours.timezone })}</p>

			<figcaption className="sr-only">
				<table>
					<caption>{t("owner.usageSections.hours")}</caption>
					<thead>
						<tr>
							<th scope="col">{t("owner.usageSections.weekday")}</th>
							{HOURS.map((hour) => (
								<th key={hour} scope="col">
									{formatNumber(hour)}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{WEEKDAYS.map((weekday) => (
							<tr key={weekday}>
								<th scope="row">{weekdayName(weekday)}</th>
								{HOURS.map((hour) => (
									<td key={hour}>{countAt(weekday, hour)}</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</figcaption>
		</figure>
	);
}
