import { type TrafficDay } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Card, CARD_HEADING, Skeleton, UsageBars } from "@/components/primitives";
import { SiteError } from "@/features/site/components/SiteError";
import { useTraffic } from "@/features/source/useSource";
import { shortDate } from "@/lib/datetime";

/** Views and clones as GitHub counts them, which needs a token the host chooses to give; without one the page says how. */
export function Traffic(): React.JSX.Element {
	const { t } = useTranslation();
	const traffic = useTraffic();

	return (
		<section aria-labelledby="traffic-title" className="flex flex-col gap-4 pt-6">
			<h2 id="traffic-title" className="font-display text-2xl font-bold tracking-tight">
				{t("source.traffic")}
			</h2>

			{traffic.isError ? (
				<SiteError
					title={t("source.trafficFailedTitle")}
					body={t("source.trafficFailedBody")}
					onRetry={() => {
						void traffic.refetch();
					}}
				/>
			) : traffic.data === undefined ? (
				<Skeleton className="h-48 w-full" />
			) : !traffic.data.available ? (
				<Card className="flex flex-col items-start gap-2">
					<h3 className={CARD_HEADING}>
						{traffic.data.reason === "no_token" ? t("source.noTokenTitle") : t("source.refusedTitle")}
					</h3>
					<p className="text-muted-foreground text-sm">
						{traffic.data.reason === "no_token" ? t("source.noTokenBody") : t("source.refusedBody")}
					</p>
					<Link to="/docs/configuration" className="text-accent text-sm underline underline-offset-2">
						{t("source.howToToken")}
					</Link>
				</Card>
			) : (
				<div className="grid items-start gap-4 lg:grid-cols-2 [&>*]:min-w-0">
					<DayChart
						title={t("source.views")}
						days={traffic.data.days}
						count={(day) => day.views}
						uniques={(day) => day.uniqueViews}
					/>
					<DayChart
						title={t("source.clones")}
						days={traffic.data.days}
						count={(day) => day.clones}
						uniques={(day) => day.uniqueClones}
					/>
					<Card className="flex flex-col gap-3">
						<h3 className={CARD_HEADING}>{t("source.referrers")}</h3>
						<UsageBars
							empty={t("source.noReferrers")}
							rows={traffic.data.referrers.map((source) => ({
								id: source.name,
								label: source.name,
								sub: t("source.uniques", { count: source.uniques }),
								count: source.count,
							}))}
						/>
					</Card>
					<Card className="flex flex-col gap-3">
						<h3 className={CARD_HEADING}>{t("source.pages")}</h3>
						<UsageBars
							empty={t("source.noPages")}
							rows={traffic.data.pages.map((page) => ({
								id: page.path,
								label: page.path,
								sub: t("source.uniques", { count: page.uniques }),
								count: page.count,
							}))}
						/>
					</Card>
				</div>
			)}
		</section>
	);
}

/** A bar per day, and the numbers behind them in a table a screen reader can read. */
function DayChart({
	title,
	days,
	count,
	uniques,
}: {
	title: string;
	days: readonly TrafficDay[];
	count: (day: TrafficDay) => number;
	uniques: (day: TrafficDay) => number;
}): React.JSX.Element {
	const { t } = useTranslation();
	const max = Math.max(1, ...days.map(count));
	const total = days.reduce((sum, day) => sum + count(day), 0);

	return (
		<Card className="flex flex-col gap-3">
			<div className="flex items-baseline justify-between gap-3">
				<h3 className={CARD_HEADING}>{title}</h3>
				<span className="text-muted-foreground text-sm tabular-nums">{t("source.total", { count: total })}</span>
			</div>

			{days.length === 0 ? (
				<p className="text-muted-foreground text-sm">{t("source.noTraffic")}</p>
			) : (
				<figure className="flex flex-col gap-2">
					<div className="flex h-28 items-end gap-px" aria-hidden="true">
						{days.map((day) => (
							<span
								key={day.date}
								title={`${shortDate(day.date)}: ${String(count(day))}`}
								className="bg-primary/30 hover:bg-primary/60 rounded-t-chip min-h-px flex-1 transition-colors duration-150"
								style={{ height: `${String(Math.round((count(day) / max) * 100))}%` }}
							/>
						))}
					</div>
					<div className="text-muted-foreground flex justify-between text-xs" aria-hidden="true">
						<span>{shortDate(days[0]?.date ?? "")}</span>
						<span>{shortDate(days.at(-1)?.date ?? "")}</span>
					</div>
					<figcaption className="sr-only">
						<table>
							<caption>{title}</caption>
							<thead>
								<tr>
									<th scope="col">{t("source.day")}</th>
									<th scope="col">{title}</th>
									<th scope="col">{t("source.unique")}</th>
								</tr>
							</thead>
							<tbody>
								{days.map((day) => (
									<tr key={day.date}>
										<th scope="row">{shortDate(day.date)}</th>
										<td>{count(day)}</td>
										<td>{uniques(day)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</figcaption>
				</figure>
			)}
		</Card>
	);
}
