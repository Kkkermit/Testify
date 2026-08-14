import { ANALYTICS_WINDOWS, errorRate, type AnalyticsWindow } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/app/ErrorState";
import { Card, Figure, Avatar, SegmentedControl, Skeleton } from "@/components/primitives";
import { CARD_HEADING } from "@/components/primitives/textStyles";
import { UsageBars } from "@/features/owner/components/UsageBars";
import { UsageChart } from "@/features/owner/components/UsageChart";
import { percent, screenLabel } from "@/features/owner/owner.utils";
import { useUsage } from "@/features/owner/useOwner";
import { cn } from "@/lib/cn";

const WINDOWS = ANALYTICS_WINDOWS.map((days) => ({ value: days, label: `${String(days)}d` }));

/** What the bot is actually used for: which commands, by which servers, on which surface. */
export function UsageTab({
	days,
	onWindow,
}: {
	days: AnalyticsWindow;
	onWindow: (days: AnalyticsWindow) => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const usage = useUsage(days);

	if (usage.isPending) return <Skeleton className="h-96 w-full" />;
	// A failed read is not an empty one: reporting it as "no usage yet" tells an owner their bot is unused.
	if (usage.isError) return <ErrorState as="h2" error={usage.error} onRetry={() => void usage.refetch()} />;

	const report = usage.data;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-muted-foreground text-sm">
					{report.runs.toLocaleString()} commands run in the last {days} days, {percent(report.failures, report.runs)}{" "}
					of them failing.
				</p>
				<SegmentedControl label={t("owner.window")} segments={WINDOWS} value={days} onChange={onWindow} />
			</div>

			<Card padding="none" className="divide-border divide-y">
				<dl className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0 [&>*]:border-border">
					<Figure className="px-6 py-4" label={t("owner.commandsRun")} value={report.runs.toLocaleString()} />
					<Figure
						className="px-6 py-4"
						label={t("owner.failed")}
						value={percent(report.failures, report.runs)}
						{...(errorRate(report) > 0.05 ? { tone: "text-destructive-text" } : {})}
					/>
					<Figure className="px-6 py-4" label={t("owner.activeServers")} value={report.activeGuilds.toLocaleString()} />
					<Figure
						className="px-6 py-4"
						label={t("owner.commandsUsed")}
						value={`${String(report.commandsUsed)} of ${String(report.commandsTotal)}`}
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
							sub: row.failures > 0 ? `${row.category} · ${String(row.failures)} failed` : row.category,
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
							sub: row.category,
							count: row.count,
						}))}
					/>
				</Panel>

				<Panel title={t("owner.busiest")} hint={t("owner.busiestHint")}>
					<UsageBars
						tint="bg-feature-tickets/25"
						empty={t("owner.noServerRun")}
						rows={report.busiestGuilds.map((row) => ({
							id: row.guildId,
							label: (
								<span className="flex items-center gap-2">
									<Avatar name={row.name} url={row.iconUrl} size={18} seed={row.guildId} />
									<span className="truncate">{row.name}</span>
								</span>
							),
							sub: `${row.memberCount.toLocaleString()} members`,
							count: row.count,
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

				{/* Full width: it is the odd one out in kind as well as in count, and a fifth panel in a two-column
				    grid would otherwise leave half a row empty under it. */}
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

function Panel({
	title,
	hint,
	wide = false,
	children,
}: {
	title: string;
	hint: string;
	wide?: boolean;
	children: React.ReactNode;
}): React.JSX.Element {
	return (
		<Card className={cn("flex flex-col gap-3", wide && "lg:col-span-2")}>
			<div>
				<h2 className={CARD_HEADING}>{title}</h2>
				<p className="text-muted-foreground text-xs">{hint}</p>
			</div>
			{children}
		</Card>
	);
}
