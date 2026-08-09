import { ANALYTICS_WINDOWS, errorRate, type AnalyticsWindow } from "@testify/shared";
import { BarChart3 } from "lucide-react";
import { Card, EmptyState, Figure, Avatar, SegmentedControl, Skeleton } from "@/components/primitives";
import { CARD_HEADING } from "@/components/primitives/textStyles";
import { UsageBars } from "@/features/owner/components/UsageBars";
import { UsageChart } from "@/features/owner/components/UsageChart";
import { percent } from "@/features/owner/owner.utils";
import { useUsage } from "@/features/owner/useOwner";

const WINDOWS = ANALYTICS_WINDOWS.map((days) => ({ value: days, label: `${String(days)}d` }));

/** What the bot is actually used for: which commands, by which servers, on which surface. */
export function UsageTab({
	days,
	onWindow,
}: {
	days: AnalyticsWindow;
	onWindow: (days: AnalyticsWindow) => void;
}): React.JSX.Element {
	const usage = useUsage(days);

	if (usage.isPending) return <Skeleton className="h-96 w-full" />;
	if (usage.isError) {
		return (
			<EmptyState
				icon={<BarChart3 size={20} />}
				title="No usage yet"
				body="Nothing has been recorded since analytics were added."
			/>
		);
	}

	const report = usage.data;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-muted-foreground text-sm">
					{report.runs.toLocaleString()} commands run in the last {days} days, {percent(report.failures, report.runs)}{" "}
					of them failing.
				</p>
				<SegmentedControl label="Reporting window" segments={WINDOWS} value={days} onChange={onWindow} />
			</div>

			<Card padding="none" className="divide-border divide-y">
				<dl className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0 [&>*]:border-border">
					<Figure className="px-6 py-4" label="Commands run" value={report.runs.toLocaleString()} />
					<Figure
						className="px-6 py-4"
						label="Failed"
						value={percent(report.failures, report.runs)}
						{...(errorRate(report) > 0.05 ? { tone: "text-destructive-text" } : {})}
					/>
					<Figure className="px-6 py-4" label="Active servers" value={report.activeGuilds.toLocaleString()} />
					<Figure
						className="px-6 py-4"
						label="Commands used"
						value={`${String(report.commandsUsed)} of ${String(report.commandsTotal)}`}
					/>
				</dl>

				<div className="px-6 py-5">
					<UsageChart days={report.daily} />
				</div>
			</Card>

			{/* `items-start` so a short panel ends where its list does, rather than stretching to its neighbour. */}
			<div className="grid items-start gap-4 lg:grid-cols-2">
				<Panel title="Most used" hint="Where the work goes, and where a regression would hurt most.">
					<UsageBars
						empty="No command has been run yet."
						rows={report.mostUsed.map((row) => ({
							id: row.command,
							label: `/${row.command}`,
							sub: row.failures > 0 ? `${row.category} · ${String(row.failures)} failed` : row.category,
							count: row.count,
						}))}
					/>
				</Panel>

				<Panel
					title="Least used"
					hint="Counted over every command the bot has, so a command nobody runs shows as zero."
				>
					<UsageBars
						tint="bg-muted"
						empty="No commands are registered."
						rows={report.leastUsed.map((row) => ({
							id: row.command,
							label: `/${row.command}`,
							sub: row.category,
							count: row.count,
						}))}
					/>
				</Panel>

				<Panel title="Busiest servers" hint="Ranked by commands run, not by how many members they have.">
					<UsageBars
						tint="bg-feature-tickets/25"
						empty="No server has run a command yet."
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

				<Panel title="How they run them" hint="Whether the prefix is still worth maintaining.">
					<UsageBars
						tint="bg-feature-levelling/25"
						empty="Nothing recorded yet."
						rows={[
							{ id: "slash", label: "Slash commands", count: report.surfaces.slash },
							{ id: "prefix", label: "Prefix commands", count: report.surfaces.prefix },
						]}
					/>
				</Panel>
			</div>
		</div>
	);
}

function Panel({
	title,
	hint,
	children,
}: {
	title: string;
	hint: string;
	children: React.ReactNode;
}): React.JSX.Element {
	return (
		<Card className="flex flex-col gap-3">
			<div>
				<h2 className={CARD_HEADING}>{title}</h2>
				<p className="text-muted-foreground text-xs">{hint}</p>
			</div>
			{children}
		</Card>
	);
}
