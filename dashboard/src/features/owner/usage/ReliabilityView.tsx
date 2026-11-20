import { type ReliabilityReport } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Card, DataList, Figure, UsageBars } from "@/components/primitives";
import { AnalyticsState } from "@/features/owner/components/AnalyticsState";
import { DayBars } from "@/features/owner/components/DayBars";
import { UsagePanel as Panel } from "@/features/owner/components/UsagePanel";
import { formatMs, NO_FIGURE, shareOrDash } from "@/features/owner/owner.utils";
import { useReliability } from "@/features/owner/useOwner";
import { dateAndTime, shortDate } from "@/lib/datetime";
import { formatNumber, formatPercent, formatUnit } from "@/lib/intl";

const ms = (value: number | null | undefined): string =>
	value === null || value === undefined ? NO_FIGURE : formatMs(Math.round(value));

const megabytes = (bytes: number | null | undefined): string =>
	bytes === null || bytes === undefined ? NO_FIGURE : formatUnit(bytes / 1_000_000, "megabyte");

/** A gauge a day: its average as the bar, its worst minute beside it. */
function GaugeBars({
	days,
	format,
	caption,
}: {
	days: ReliabilityReport["process"]["memory"];
	format: (value: number | null | undefined) => string;
	caption: string;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<DayBars
			tint="bg-hue-violet/40"
			days={days.map((day) => ({ day: day.day, value: day.value }))}
			also={{ label: t("owner.usageSections.worstMinute"), values: days.map((day) => day.max ?? 0) }}
			format={format}
			caption={caption}
			valueLabel={t("owner.usageSections.average")}
		/>
	);
}

export function ReliabilityView({ days }: { days: number }): React.JSX.Element {
	const { t } = useTranslation();
	const reliability = useReliability(days);

	return (
		<AnalyticsState query={reliability}>
			{(report) => {
				const totals = report.totals;
				return (
					<div className="flex flex-col gap-4">
						<Card padding="none" className="divide-border divide-y">
							<dl className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0 [&>*]:border-border">
								<Figure
									className="px-6 py-4"
									label={t("owner.usageSections.missedDeadlines")}
									value={formatNumber(totals?.missedDeadlines ?? 0)}
								/>
								<Figure
									className="px-6 py-4"
									label={t("owner.usageSections.noResponse")}
									value={formatNumber(totals?.noResponse ?? 0)}
								/>
								<Figure
									className="px-6 py-4"
									label={t("owner.usageSections.over3s")}
									value={shareOrDash(totals?.over3sRate ?? null)}
								/>
								<Figure
									className="px-6 py-4"
									label={t("owner.usageSections.answerTimes")}
									value={t("owner.usageSections.answerTimesValue", {
										p50: ms(totals?.p50Ms ?? null),
										p95: ms(totals?.p95Ms ?? null),
									})}
								/>
							</dl>
							<div className="flex flex-col gap-2 px-6 py-5">
								<p className="text-muted-foreground text-xs">
									{t("owner.usageSections.totalsSince", { date: shortDate(report.from) })}
								</p>
								<DayBars
									tint="bg-destructive/30"
									days={report.daily.map((day) => ({ day: day.day, value: day.errors + day.late }))}
									caption={t("owner.usageSections.failuresPerDay")}
									valueLabel={t("owner.failures")}
								/>
							</div>
						</Card>

						<div className="grid items-start gap-4 lg:grid-cols-2">
							<Panel wide title={t("owner.usageSections.routes")} hint={t("owner.usageSections.routesHint")}>
								<UsageBars
									tint="bg-hue-blue/20"
									empty={t("owner.nothingRecorded")}
									rows={report.rest.map((row) => ({
										id: `${row.method} ${row.route}`,
										label: (
											<code className="font-mono text-sm">
												{row.method} {row.route}
											</code>
										),
										sub: t("owner.usageSections.routeSub", {
											failed: row.failures,
											retried: row.retries,
											slow: ms(row.p95Ms),
										}),
										count: row.calls,
									}))}
								/>
							</Panel>

							<Panel title={t("owner.usageSections.limits")} hint={t("owner.usageSections.limitsHint")}>
								<DataList
									dense
									rows={[
										{
											label: t("owner.usageSections.invalidRequests"),
											value:
												report.invalidRequests === null
													? NO_FIGURE
													: t("owner.usageSections.invalidValue", {
															used: formatNumber(report.invalidRequests.used),
															limit: formatNumber(report.invalidRequests.limit),
															share: formatPercent(report.invalidRequests.share, 1),
														}),
										},
										{
											label: t("owner.usageSections.sessionsLeft"),
											value:
												report.sessions === null
													? NO_FIGURE
													: t("common.partOf", { part: report.sessions.remaining, whole: report.sessions.total }),
										},
									]}
								/>
							</Panel>

							<Panel title={t("owner.usageSections.bursts")} hint={t("owner.usageSections.burstsHint")}>
								<UsageBars
									tint="bg-hue-amber/20"
									empty={t("owner.usageSections.noBursts")}
									rows={report.bursts.map((row) => ({
										id: row.minute,
										label: dateAndTime(row.minute),
										sub: t("owner.usageSections.burstSub", { number: Math.round(row.median) }),
										count: row.runs,
									}))}
								/>
							</Panel>

							<Panel title={t("owner.usageSections.memory")} hint={t("owner.usageSections.memoryHint")}>
								<GaugeBars days={report.process.memory} format={megabytes} caption={t("owner.usageSections.memory")} />
							</Panel>

							<Panel title={t("owner.usageSections.eventLoop")} hint={t("owner.usageSections.eventLoopHint")}>
								<GaugeBars days={report.process.eventLoop} format={ms} caption={t("owner.usageSections.eventLoop")} />
							</Panel>

							<Panel title={t("owner.usageSections.errorsByCode")} hint={t("owner.usageSections.errorsByCodeHint")}>
								<UsageBars
									tint="bg-destructive/15"
									empty={t("owner.usageSections.noErrors")}
									rows={report.errorsByCode.map((row) => ({
										id: row.key,
										label: <code className="font-mono text-sm">{row.key}</code>,
										count: row.count,
									}))}
								/>
							</Panel>

							<Panel
								title={t("owner.usageSections.rateLimits")}
								hint={t("owner.usageSections.rateLimitsHint", {
									number: report.rateLimits.daily.reduce((total, day) => total + day.count, 0),
								})}
							>
								<DayBars
									tint="bg-hue-amber/40"
									days={report.rateLimits.daily.map((day) => ({ day: day.day, value: day.count }))}
									caption={t("owner.usageSections.rateLimitsPerDay")}
									valueLabel={t("owner.usageSections.rateLimits")}
								/>
								<UsageBars
									tint="bg-hue-amber/20"
									empty={t("owner.usageSections.noRateLimits")}
									rows={report.rateLimits.routes.map((row) => ({
										id: `${row.scope} ${row.route}`,
										label: <code className="font-mono text-sm">{row.route}</code>,
										sub: row.scope,
										count: row.count,
									}))}
								/>
							</Panel>

							<Panel title={t("owner.usageSections.gateway")} hint={t("owner.usageSections.gatewayHint")}>
								<DayBars
									tint="bg-hue-blue/40"
									days={report.shards.daily.map((day) => ({ day: day.day, value: day.pingMs }))}
									caption={t("owner.usageSections.pingPerDay")}
									valueLabel={t("owner.gatewayPing")}
								/>
								<UsageBars
									tint="bg-hue-blue/20"
									empty={t("owner.usageSections.noShards")}
									rows={report.shards.now.map((row) => ({
										id: String(row.shard),
										label: t("owner.usageSections.shard", { shard: row.shard }),
										...(row.stale ? { sub: t("owner.usageSections.shardStale") } : {}),
										count: row.pingMs,
										value: formatMs(row.pingMs),
									}))}
								/>
							</Panel>

							<Panel title={t("owner.usageSections.shardEvents")} hint={t("owner.usageSections.shardEventsHint")}>
								{report.shards.events.length === 0 ? (
									<p className="text-muted-foreground py-2 text-sm">{t("owner.usageSections.noShardEvents")}</p>
								) : (
									<ol className="divide-border flex flex-col divide-y text-sm">
										{report.shards.events.map((event) => (
											<li
												key={`${event.at} ${String(event.shard)} ${event.state}`}
												className="flex flex-wrap gap-x-3 py-2"
											>
												<span className="tabular-nums">{dateAndTime(event.at)}</span>
												<span>{t("owner.usageSections.shard", { shard: event.shard })}</span>
												<code className="font-mono">{event.state}</code>
												{event.closeCode !== null && (
													<span className="text-muted-foreground">
														{t("owner.usageSections.closeCode", { code: event.closeCode })}
													</span>
												)}
											</li>
										))}
									</ol>
								)}
							</Panel>
						</div>
					</div>
				);
			}}
		</AnalyticsState>
	);
}
