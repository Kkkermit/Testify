import { errorRate, type AnalyticsWindow, type GuildUsageRow } from "@testify/shared";
import { type TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { Avatar, Card, Figure, SegmentedControl, Skeleton, UsageBars } from "@/components/primitives";
import { categoryLabel } from "@/features/commands/categories.labels";
import { GuildUsage } from "@/features/owner/components/GuildUsage";
import { UsageChart } from "@/features/owner/components/UsageChart";
import { UsagePanel as Panel } from "@/features/owner/components/UsagePanel";
import { formatMs, percent, screenLabel, searchWith, snowflakeFrom, WINDOWS } from "@/features/owner/owner.utils";
import { useUsage } from "@/features/owner/useOwner";
import { formatNumber } from "@/lib/intl";

/** What the bot is actually used for, or, with `?guild=`, who in one server ran what. */
export function UsageTab({
	days,
	onWindow,
}: {
	days: AnalyticsWindow;
	onWindow: (days: AnalyticsWindow) => void;
}): React.JSX.Element {
	const [params] = useSearchParams();
	const guildId = snowflakeFrom(params.get("guild"));

	return guildId === null ? (
		<FleetUsage days={days} onWindow={onWindow} />
	) : (
		<GuildUsage guildId={guildId} days={days} onWindow={onWindow} />
	);
}

/** Which commands, by which servers, on which surface. */
function FleetUsage({
	days,
	onWindow,
}: {
	days: AnalyticsWindow;
	onWindow: (days: AnalyticsWindow) => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [params] = useSearchParams();
	const usage = useUsage(days);

	if (usage.isPending) return <Skeleton className="h-96 w-full" />;
	// A failed read is not an empty one: reporting it as "no usage yet" tells an owner their bot is unused.
	if (usage.isError) return <ErrorState as="h2" error={usage.error} onRetry={() => void usage.refetch()} />;

	const report = usage.data;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-muted-foreground text-sm">
					{t("owner.usageSummary", {
						count: report.runs,
						days,
						failing: percent(report.failures, report.runs),
					})}
				</p>
				<SegmentedControl label={t("owner.window")} segments={WINDOWS} value={days} onChange={onWindow} />
			</div>

			<Card padding="none" className="divide-border divide-y">
				<dl className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0 [&>*]:border-border">
					<Figure className="px-6 py-4" label={t("owner.commandsRun")} value={formatNumber(report.runs)} />
					<Figure
						className="px-6 py-4"
						label={t("owner.failed")}
						value={percent(report.failures, report.runs)}
						{...(errorRate(report) > 0.05 ? { tone: "text-destructive-text" } : {})}
					/>
					<Figure className="px-6 py-4" label={t("owner.activeServers")} value={formatNumber(report.activeGuilds)} />
					<Figure
						className="px-6 py-4"
						label={t("owner.commandsUsed")}
						value={t("common.partOf", { part: report.commandsUsed, whole: report.commandsTotal })}
					/>
				</dl>

				<div className="px-6 py-5">
					<UsageChart days={report.daily} />
				</div>
			</Card>

			{/* `items-start` so a short panel ends where its list does, rather than stretching to its neighbour. */}
			<div className="grid items-start gap-4 lg:grid-cols-2">
				<Panel title={t("owner.mostUsed")} hint={t("owner.mostUsedHint")}>
					<UsageBars
						empty={t("owner.noCommandRun")}
						rows={report.mostUsed.map((row) => ({
							id: row.command,
							label: `/${row.command}`,
							sub:
								row.failures > 0
									? t("owner.categoryFailed", { category: categoryLabel(row.category, t), failed: row.failures })
									: categoryLabel(row.category, t),
							count: row.count,
						}))}
					/>
				</Panel>

				<Panel title={t("owner.leastUsed")} hint={t("owner.leastUsedHint")}>
					<UsageBars
						tint="bg-muted"
						empty={t("owner.noCommandsRegistered")}
						rows={report.leastUsed.map((row) => ({
							id: row.command,
							label: `/${row.command}`,
							sub: categoryLabel(row.category, t),
							count: row.count,
						}))}
					/>
				</Panel>

				<Panel title={t("owner.busiest")} hint={t("owner.busiestHint")}>
					<UsageBars
						tint="bg-feature-tickets/25"
						empty={t("owner.noServerRun")}
						rows={report.busiestGuilds.map((row) => guildBar(row, params, t))}
					/>
				</Panel>

				<Panel title={t("owner.dashboardBusiest")} hint={t("owner.dashboardBusiestHint")}>
					<UsageBars
						tint="bg-feature-economy/25"
						empty={t("owner.noServerDashboard")}
						rows={report.dashboardGuilds.map((row) => guildBar(row, params, t))}
					/>
				</Panel>

				<Panel title={t("owner.slowest")} hint={t("owner.slowestHint", { days: report.runDays })}>
					<UsageBars
						tint="bg-destructive/20"
						empty={t("owner.noSlowRuns")}
						rows={report.slowest.map((row) => ({
							id: row.command,
							label: `/${row.command}`,
							sub: t("owner.slowSub", { count: row.runs, typical: formatMs(row.typicalMs) }),
							count: row.slowMs,
							value: formatMs(row.slowMs),
						}))}
					/>
				</Panel>

				<Panel title={t("owner.howRun")} hint={t("owner.howRunHint")}>
					<UsageBars
						tint="bg-feature-levelling/25"
						empty={t("owner.nothingRecorded")}
						rows={[
							{ id: "slash", label: t("owner.slashCommands"), count: report.surfaces.slash },
							{ id: "prefix", label: t("owner.prefixCommands"), count: report.surfaces.prefix },
						]}
					/>
				</Panel>

				{/* The seventh panel, so it spans the row rather than leaving half of one empty. */}
				<Panel wide title={t("owner.screens")} hint={t("owner.screensHint")}>
					<UsageBars
						tint="bg-feature-welcome/25"
						empty={t("owner.noScreenOpened")}
						rows={report.screens.map((screen) => ({
							id: screen.route,
							label: screenLabel(screen.route),
							sub: screen.route,
							count: screen.count,
						}))}
					/>
				</Panel>
			</div>
		</div>
	);
}

/** A server's row opens its own usage, keeping the window it was found in. */
function guildBar(
	row: GuildUsageRow,
	params: URLSearchParams,
	t: TFunction,
): React.ComponentProps<typeof UsageBars>["rows"][number] {
	return {
		id: row.guildId,
		label: (
			<Link
				to={searchWith(params, { guild: row.guildId })}
				className="hover:text-accent flex items-center gap-2 transition-colors duration-150"
			>
				<Avatar name={row.name} url={row.iconUrl} size={18} seed={row.guildId} />
				<span className="truncate">{row.name}</span>
			</Link>
		),
		sub: t("common.memberCount", { count: row.memberCount }),
		count: row.count,
	};
}
