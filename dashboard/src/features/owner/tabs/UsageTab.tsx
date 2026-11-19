import { type AnalyticsWindow, type GuildUsageRow, type UsageReport } from "@testify/shared";
import { type TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { Warning } from "@/components/form";
import { Avatar, Card, Figure, SegmentedControl, UsageBars } from "@/components/primitives";
import { ShardlensLinks } from "@/features/owner/components/AnalyticsNotice";
import { AnalyticsState } from "@/features/owner/components/AnalyticsState";
import { GuildUsage } from "@/features/owner/components/GuildUsage";
import { LiveStrip } from "@/features/owner/components/LiveStrip";
import { RunFigures } from "@/features/owner/components/RunFigures";
import { UsagePanel as Panel } from "@/features/owner/components/UsagePanel";
import {
	commandBar,
	formatMs,
	percent,
	screenLabel,
	searchWith,
	snowflakeFrom,
	surfaceBars,
	WINDOWS,
} from "@/features/owner/owner.utils";
import { ActivityView } from "@/features/owner/usage/ActivityView";
import { JourneysView } from "@/features/owner/usage/JourneysView";
import { PanelsView } from "@/features/owner/usage/PanelsView";
import { PeopleView } from "@/features/owner/usage/PeopleView";
import { ReliabilityView } from "@/features/owner/usage/ReliabilityView";
import { RunsView } from "@/features/owner/usage/RunsView";
import { ServersView } from "@/features/owner/usage/ServersView";
import { USAGE_VIEWS, viewFrom, VIEW_LABELS } from "@/features/owner/usage/usage.utils";
import { useUsage } from "@/features/owner/useOwner";
import { formatNumber } from "@/lib/intl";

export function UsageTab({
	days,
	onWindow,
}: {
	days: AnalyticsWindow;
	onWindow: (days: AnalyticsWindow) => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [params, setParams] = useSearchParams();
	const guildId = snowflakeFrom(params.get("guild"));
	const view = viewFrom(params.get("view"));

	if (guildId !== null) return <GuildUsage guildId={guildId} days={days} onWindow={onWindow} />;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<SegmentedControl
					label={t("owner.usageSections.views")}
					segments={USAGE_VIEWS.map((value) => ({ value, label: t(VIEW_LABELS[value]) }))}
					value={view}
					onChange={(value) => {
						setParams(searchWith(params, { view: value === "commands" ? null : value }), { replace: true });
					}}
				/>
				<SegmentedControl label={t("owner.window")} segments={WINDOWS} value={days} onChange={onWindow} />
			</div>

			<LiveStrip />

			{view === "commands" && <FleetUsage days={days} />}
			{view === "people" && <PeopleView days={days} />}
			{view === "servers" && <ServersView days={days} />}
			{view === "panels" && <PanelsView days={days} />}
			{view === "activity" && <ActivityView days={days} />}
			{view === "reliability" && <ReliabilityView days={days} />}
			{view === "journeys" && <JourneysView days={days} />}
			{view === "runs" && <RunsView days={days} />}
		</div>
	);
}

function FleetUsage({ days }: { days: AnalyticsWindow }): React.JSX.Element {
	const [params] = useSearchParams();
	const usage = useUsage(days);

	return (
		<AnalyticsState query={usage}>
			{(report) => <FleetFigures report={report} days={days} params={params} />}
		</AnalyticsState>
	);
}

function FleetFigures({
	report,
	days,
	params,
}: {
	report: UsageReport;
	days: AnalyticsWindow;
	params: URLSearchParams;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col gap-4">
			<p className="text-muted-foreground text-sm">
				{t("owner.usageSummary", {
					count: report.runs,
					days,
					failing: percent(report.failures, report.runs),
				})}
			</p>

			{report.detailDays < days && <Warning>{t("owner.detailDaysNote", { days: report.detailDays })}</Warning>}

			<Card padding="none" className="divide-border divide-y">
				<RunFigures runs={report.runs} failures={report.failures} daily={report.daily}>
					<Figure className="px-6 py-4" label={t("owner.activeServers")} value={formatNumber(report.activeGuilds)} />
					<Figure
						className="px-6 py-4"
						label={t("owner.commandsUsed")}
						value={t("common.partOf", { part: report.commandsUsed, whole: report.commandsTotal })}
					/>
				</RunFigures>
			</Card>

			{/* `items-start` so a short panel ends where its list does, rather than stretching to its neighbour. */}
			<div className="grid items-start gap-4 lg:grid-cols-2">
				<Panel title={t("owner.mostUsed")} hint={t("owner.mostUsedHint")}>
					<UsageBars empty={t("owner.noCommandRun")} rows={report.mostUsed.map((row) => commandBar(row, t))} />
				</Panel>

				<Panel title={t("owner.leastUsed")} hint={t("owner.leastUsedHint")}>
					<UsageBars
						tint="bg-muted"
						empty={t("owner.noCommandsRegistered")}
						rows={report.leastUsed.map((row) => commandBar(row, t))}
					/>
				</Panel>

				<Panel title={t("owner.busiest")} hint={t("owner.busiestHint")}>
					<UsageBars
						tint="bg-hue-blue/20"
						empty={t("owner.noServerRun")}
						rows={report.busiestGuilds.map((row) => guildBar(row, params, t))}
					/>
				</Panel>

				<Panel title={t("owner.dashboardBusiest")} hint={t("owner.dashboardBusiestHint")}>
					<UsageBars
						tint="bg-hue-amber/20"
						empty={t("owner.noServerDashboard")}
						rows={report.dashboardGuilds.map((row) => guildBar(row, params, t))}
					/>
				</Panel>

				<Panel title={t("owner.slowest")} hint={t("owner.slowestHint")}>
					<UsageBars
						tint="bg-destructive/15"
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
						tint="bg-hue-violet/20"
						empty={t("owner.nothingRecorded")}
						rows={surfaceBars(report.surfaces, t)}
					/>
				</Panel>

				{/* The seventh panel, so it spans the row rather than leaving half of one empty. */}
				<Panel wide title={t("owner.screens")} hint={t("owner.screensHint")}>
					<UsageBars
						tint="bg-hue-green/20"
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

			<ShardlensLinks collector={report.collector} />
		</div>
	);
}

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
