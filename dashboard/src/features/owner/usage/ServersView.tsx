import { useTranslation } from "react-i18next";
import { Warning } from "@/components/form";
import { Card, Figure, UsageBars } from "@/components/primitives";
import { AnalyticsState } from "@/features/owner/components/AnalyticsState";
import { CohortTable } from "@/features/owner/components/CohortTable";
import { DayBars } from "@/features/owner/components/DayBars";
import { UsagePanel as Panel } from "@/features/owner/components/UsagePanel";
import { NO_FIGURE, shareOrDash } from "@/features/owner/owner.utils";
import { labelOf, LIFETIME_LABELS, tallyBars, WEBHOOK_LABELS } from "@/features/owner/usage/usage.utils";
import { useGrowth } from "@/features/owner/useOwner";
import { formatNumber } from "@/lib/intl";

export function ServersView({ days }: { days: number }): React.JSX.Element {
	const { t } = useTranslation();
	const growth = useGrowth(days);

	return (
		<AnalyticsState query={growth}>
			{(report) => (
				<div className="flex flex-col gap-4">
					{report.serverCount.warn && report.serverCount.discord !== null && (
						<Warning>
							{t("owner.usageSections.countDrift", {
								counted: report.serverCount.ours,
								discord: report.serverCount.discord,
							})}
						</Warning>
					)}

					<Card padding="none" className="divide-border divide-y">
						<dl className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0 [&>*]:border-border">
							<Figure className="px-6 py-4" label={t("owner.usageSections.added")} value={formatNumber(report.joins)} />
							<Figure className="px-6 py-4" label={t("owner.usageSections.left")} value={formatNumber(report.leaves)} />
							<Figure
								className="px-6 py-4"
								label={t("owner.usageSections.activated")}
								value={shareOrDash(report.activation.rate)}
							/>
							<Figure
								className="px-6 py-4"
								label={t("owner.usageSections.inactive")}
								value={
									report.installs === null
										? NO_FIGURE
										: t("common.partOf", { part: report.installs.inactive, whole: report.installs.active })
								}
							/>
						</dl>
						<div className="grid gap-6 px-6 py-5 sm:grid-cols-2">
							<div className="flex flex-col gap-2">
								<p className="text-sm font-medium">{t("owner.usageSections.addedPerDay")}</p>
								<DayBars
									tint="bg-success/40"
									days={report.daily.map((day) => ({ day: day.day, value: day.joins }))}
									caption={t("owner.usageSections.addedPerDay")}
									valueLabel={t("owner.usageSections.added")}
								/>
							</div>
							<div className="flex flex-col gap-2">
								<p className="text-sm font-medium">{t("owner.usageSections.leftPerDay")}</p>
								<DayBars
									tint="bg-destructive/30"
									days={report.daily.map((day) => ({ day: day.day, value: day.leaves }))}
									caption={t("owner.usageSections.leftPerDay")}
									valueLabel={t("owner.usageSections.left")}
								/>
							</div>
						</div>
						{report.detected.joins + report.detected.leaves > 0 && (
							<p className="text-muted-foreground px-6 py-3 text-xs">
								{t("owner.usageSections.detectedNote", {
									added: report.detected.joins,
									left: report.detected.leaves,
								})}
							</p>
						)}
					</Card>

					<div className="grid items-start gap-4 lg:grid-cols-2">
						<Panel title={t("owner.usageSections.sizeAtInstall")} hint={t("owner.usageSections.sizeAtInstallHint")}>
							<UsageBars
								tint="bg-hue-green/20"
								empty={t("owner.usageSections.noneAdded")}
								rows={report.sizeAtInstall.map((row) => ({
									id: row.key,
									label: t("owner.usageSections.membersBucket", { bucket: row.key }),
									count: row.count,
								}))}
							/>
						</Panel>

						<Panel title={t("owner.usageSections.lifetimes")} hint={t("owner.usageSections.lifetimesHint")}>
							<UsageBars
								tint="bg-destructive/15"
								empty={t("owner.usageSections.noneLeft")}
								rows={report.lifetimes.map((row) => ({
									id: row.key,
									label: labelOf(LIFETIME_LABELS, row.key, t),
									count: row.count,
								}))}
							/>
						</Panel>

						<Panel title={t("owner.usageSections.discordCount")} hint={t("owner.usageSections.discordCountHint")}>
							<DayBars
								tint="bg-hue-blue/40"
								days={report.discordCount}
								caption={t("owner.usageSections.discordCount")}
								valueLabel={t("owner.usageSections.servers")}
							/>
						</Panel>

						<Panel
							title={t("owner.usageSections.fromDiscord")}
							hint={t(
								WEBHOOK_LABELS[String(report.installsFromDiscord.webhookStatus)] ??
									"owner.usageSections.webhooksUnknown",
							)}
						>
							<DayBars
								tint="bg-success/40"
								days={report.installsFromDiscord.daily.map((day) => ({ day: day.day, value: day.serverInstalls }))}
								caption={t("owner.usageSections.fromDiscord")}
								valueLabel={t("owner.usageSections.serverInstalls")}
								also={{
									label: t("owner.usageSections.userInstalls"),
									values: report.installsFromDiscord.daily.map((day) => day.userInstalls),
								}}
							/>
							<UsageBars
								tint="bg-success/20"
								empty={t("owner.nothingRecorded")}
								rows={tallyBars(report.installsFromDiscord.scopes, (key) => (
									<code className="font-mono text-sm">{key}</code>
								))}
							/>
						</Panel>

						<Panel
							wide
							title={t("owner.usageSections.serverCohorts")}
							hint={t("owner.usageSections.serverCohortsHint")}
						>
							<CohortTable
								caption={t("owner.usageSections.serverCohorts")}
								sizeLabel={t("owner.usageSections.firstWeek")}
								empty={t("owner.usageSections.noServerCohorts")}
								periodLabel={(period) => t("owner.usageSections.weekN", { number: period })}
								rows={report.cohorts.map((row) => ({
									cohort: row.cohort,
									size: row.weeks[0] ?? 0,
									cells: row.weeks.slice(1).map((servers) => formatNumber(servers)),
								}))}
							/>
						</Panel>
					</div>
				</div>
			)}
		</AnalyticsState>
	);
}
