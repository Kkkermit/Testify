import { ANALYTICS_WINDOWS, errorRate, type AnalyticsWindow } from "@testify/shared";
import { BarChart3 } from "lucide-react";
import { Card, EmptyState, GuildIcon, Skeleton } from "@/components/primitives";
import { UsageBars } from "@/features/owner/components/UsageBars";
import { UsageChart } from "@/features/owner/components/UsageChart";
import { percent } from "@/features/owner/owner.utils";
import { useUsage } from "@/features/owner/useOwner";
import { cn } from "@/lib/cn";

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
				<WindowPicker days={days} onChange={onWindow} />
			</div>

			<Card padding="none" className="divide-border divide-y">
				<div className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0 [&>*]:border-border">
					<Figure label="Commands run" value={report.runs.toLocaleString()} />
					<Figure
						label="Failed"
						value={percent(report.failures, report.runs)}
						{...(errorRate(report) > 0.05 ? { tone: "text-destructive" } : {})}
					/>
					<Figure label="Active servers" value={report.activeGuilds.toLocaleString()} />
					<Figure label="Commands used" value={`${String(report.commandsUsed)} of ${String(report.commandsTotal)}`} />
				</div>

				<div className="px-6 py-5">
					<UsageChart days={report.daily} />
				</div>
			</Card>

			<div className="grid gap-4 lg:grid-cols-2">
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
									<GuildIcon name={row.name} url={row.iconUrl} size={18} seed={row.guildId} />
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

function WindowPicker({
	days,
	onChange,
}: {
	days: AnalyticsWindow;
	onChange: (days: AnalyticsWindow) => void;
}): React.JSX.Element {
	return (
		<div role="group" aria-label="Reporting window" className="border-border flex rounded-lg border p-0.5">
			{ANALYTICS_WINDOWS.map((option) => (
				<button
					key={option}
					type="button"
					aria-pressed={days === option}
					onClick={() => {
						onChange(option);
					}}
					className={cn(
						"rounded-md px-3 py-1 text-sm transition-colors duration-150",
						days === option ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
					)}
				>
					{option}d
				</button>
			))}
		</div>
	);
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: string }): React.JSX.Element {
	return (
		<div className="px-6 py-4">
			<p className="text-muted-foreground text-xs">{label}</p>
			<p className={cn("mt-1 font-mono text-xl tabular-nums", tone)}>{value}</p>
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
				<h3 className="text-base font-semibold">{title}</h3>
				<p className="text-muted-foreground text-xs">{hint}</p>
			</div>
			{children}
		</Card>
	);
}
