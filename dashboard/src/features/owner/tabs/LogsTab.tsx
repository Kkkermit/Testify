import { LOG_LEVELS, LOG_LEVEL_RANK, type LogFeed, type ReportedLogLevel } from "@testify/shared";
import { Pause, Play, Search } from "lucide-react";
import { FIELD, Warning } from "@/components/form";
import { Button, Card, Skeleton } from "@/components/primitives";
import { LogLines } from "@/features/owner/components/LogLines";
import { useLogs } from "@/features/owner/useOwner";
import { cn } from "@/lib/cn";

/**
 * The label is written out rather than produced by `text-transform: capitalize`, because engines disagree about
 * whether a CSS transform changes an element's accessible name — and a control named "error" in one browser
 * and "Error" in another is a control nobody can write a reliable instruction for.
 */
const LEVELS: Record<ReportedLogLevel, { label: string; describes: string }> = {
	trace: { label: "All", describes: "Every line the bot writes" },
	debug: { label: "Debug", describes: "Debug and above" },
	info: { label: "Info", describes: "Start-up and routine notices" },
	warn: { label: "Warnings", describes: "Warnings and worse" },
	error: { label: "Errors", describes: "Failures only" },
	fatal: { label: "Fatal", describes: "Only what stopped the bot" },
};

/**
 * The bot's own log, held in memory rather than in the database — a restart clears it, which is the trade for a
 * buffer that needs no retention policy and cannot fill a disk.
 */
export function LogsTab({
	level,
	search,
	paused,
	onLevel,
	onSearch,
	onPause,
}: {
	level: ReportedLogLevel;
	search: string;
	paused: boolean;
	onLevel: (level: ReportedLogLevel) => void;
	onSearch: (search: string) => void;
	onPause: (paused: boolean) => void;
}): React.JSX.Element {
	const logs = useLogs(level, search, paused);

	return (
		<div className="flex flex-col gap-4">
			<Card padding="compact" className="flex flex-wrap items-center gap-3">
				<label className="relative min-w-52 flex-1">
					<span className="sr-only">Search the log</span>
					<Search
						size={15}
						aria-hidden="true"
						className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
					/>
					<input
						type="search"
						value={search}
						placeholder="Search messages, guild ids, errors…"
						onChange={(event) => {
							onSearch(event.target.value);
						}}
						className={cn(FIELD, "pl-9")}
					/>
				</label>

				<div role="group" aria-label="Minimum level" className="border-border flex rounded-lg border p-0.5">
					{LOG_LEVELS.map((option) => (
						<button
							key={option}
							type="button"
							aria-pressed={level === option}
							title={LEVELS[option].describes}
							onClick={() => {
								onLevel(option);
							}}
							className={cn(
								"rounded-md px-2.5 py-1 text-sm transition-colors duration-150",
								level === option ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
							)}
						>
							{LEVELS[option].label}
						</button>
					))}
				</div>

				<Button
					variant="ghost"
					onClick={() => {
						onPause(!paused);
					}}
				>
					{paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
					{paused ? "Resume" : "Pause"}
				</Button>
			</Card>

			<p className="text-muted-foreground text-sm" aria-live="polite">
				{summarise(logs.data, paused)}
			</p>

			{logs.data !== undefined && LOG_LEVEL_RANK[logs.data.loggerLevel] > LOG_LEVEL_RANK[level] && (
				<Warning>
					Testify is running at <span className="font-mono">LOG_LEVEL={logs.data.loggerLevel}</span>, so nothing below
					that is written at all. Restart it with a lower level to capture more.
				</Warning>
			)}

			<Card padding="compact" aria-busy={logs.isPending}>
				{logs.isPending ? <Skeleton className="h-64 w-full" /> : <LogLines lines={logs.data?.lines ?? []} />}
			</Card>

			<p className="text-muted-foreground text-xs">
				Anything that looked like a token, a password or a connection string was removed before the line was stored.
			</p>
		</div>
	);
}

/** Says what is on screen and what is behind it, so nobody reads a truncated list as the whole buffer. */
function summarise(feed: LogFeed | undefined, paused: boolean): string {
	if (feed === undefined) return "Reading the buffer…";

	const shown = `Showing ${String(feed.lines.length)} of ${String(feed.matched)} matching lines`;
	const held = `${String(feed.buffered)} of ${String(feed.capacity)} held`;

	return `${shown}, ${held}. ${paused ? "Paused." : "Refreshing every 5 seconds."}`;
}
