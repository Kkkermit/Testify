import { LOG_LEVELS, type ReportedLogLevel } from "@testify/shared";
import { Card, Skeleton } from "@/components/primitives";
import { LogLines } from "@/features/owner/components/LogLines";
import { useLogs } from "@/features/owner/useOwner";
import { cn } from "@/lib/cn";

/**
 * The label is written out rather than produced by `text-transform: capitalize`, because engines disagree about
 * whether a CSS transform changes an element's accessible name — and a control named "error" in one browser
 * and "Error" in another is a control nobody can write a reliable instruction for.
 */
const LEVELS: Record<ReportedLogLevel, { label: string; describes: string }> = {
	info: { label: "Info", describes: "Everything, including start-up and routine notices" },
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
	onLevel,
}: {
	level: ReportedLogLevel;
	onLevel: (level: ReportedLogLevel) => void;
}): React.JSX.Element {
	const logs = useLogs(level);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-muted-foreground text-sm">
					{logs.data === undefined
						? "Reading the buffer…"
						: `Holding the last ${String(logs.data.buffered)} of ${String(logs.data.capacity)} lines, refreshed every 15 seconds.`}
				</p>

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
								"rounded-md px-3 py-1 text-sm transition-colors duration-150",
								level === option ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
							)}
						>
							{LEVELS[option].label}
						</button>
					))}
				</div>
			</div>

			<Card padding="compact" aria-busy={logs.isPending}>
				{logs.isPending ? <Skeleton className="h-64 w-full" /> : <LogLines lines={logs.data?.lines ?? []} />}
			</Card>

			<p className="text-muted-foreground text-xs">
				Anything that looked like a token, a password or a connection string was removed before the line was stored.
			</p>
		</div>
	);
}
