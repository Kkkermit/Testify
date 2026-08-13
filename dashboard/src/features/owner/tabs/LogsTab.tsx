import { LOG_LEVELS, LOG_LEVEL_RANK, type LogFeed, type ReportedLogLevel } from "@testify/shared";
import { type TFunction } from "i18next";
import { Pause, Play, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/app/ErrorState";
import { FIELD, Warning } from "@/components/form";
import { Button, Card, type Segment, SegmentedControl, Skeleton } from "@/components/primitives";
import { LogLines } from "@/features/owner/components/LogLines";
import { useLogs } from "@/features/owner/useOwner";
import { useDebounced } from "@/hooks/useDebounced";
import { type TranslationKey } from "@/i18n";
import { cn } from "@/lib/cn";

/**
 * Keys rather than text: a module-level map is built before a locale is chosen. Written out rather than
 * `text-transform: capitalize`, because engines disagree about whether a CSS transform changes an accessible name.
 */
const LEVELS: Record<ReportedLogLevel, { label: TranslationKey; hint: TranslationKey }> = {
	trace: { label: "owner.levelAll", hint: "owner.levelTrace" },
	debug: { label: "owner.levelDebugName", hint: "owner.levelDebug" },
	info: { label: "owner.levelInfoName", hint: "owner.levelInfo" },
	warn: { label: "owner.levelWarnName", hint: "owner.levelWarn" },
	error: { label: "owner.levelErrorName", hint: "owner.levelError" },
	fatal: { label: "owner.levelFatalName", hint: "owner.levelFatal" },
};

/** Held in memory rather than in the database, so a restart clears it. */
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
	const { t } = useTranslation();
	const levelSegments: Segment<ReportedLogLevel>[] = LOG_LEVELS.map((level) => ({
		value: level,
		label: t(LEVELS[level].label),
		hint: t(LEVELS[level].hint),
	}));
	// The field stays live while the request trails it, so a search is one query rather than one per keystroke.
	const logs = useLogs(level, useDebounced(search), paused);

	return (
		<div className="flex flex-col gap-4">
			<Card padding="compact" className="flex flex-wrap items-center gap-3">
				<label className="relative min-w-52 flex-1">
					<span className="sr-only">{t("owner.searchLog")}</span>
					<Search
						size={15}
						aria-hidden="true"
						className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
					/>
					<input
						type="search"
						value={search}
						placeholder={t("owner.searchLogPlaceholder")}
						onChange={(event) => {
							onSearch(event.target.value);
						}}
						className={cn(FIELD, "pl-9")}
					/>
				</label>

				<SegmentedControl label={t("owner.minimumLevel")} segments={levelSegments} value={level} onChange={onLevel} />

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
				{summarise(logs.data, paused, t)}
			</p>

			{logs.data !== undefined && LOG_LEVEL_RANK[logs.data.loggerLevel] > LOG_LEVEL_RANK[level] && (
				<Warning>
					Testify is running at <span className="font-mono">LOG_LEVEL={logs.data.loggerLevel}</span>, so nothing below
					that is written at all. Restart it with a lower level to capture more.
				</Warning>
			)}

			{/* An unreadable feed must not render as an empty one — this is the screen you open when things are wrong. */}
			{logs.isError ? (
				<ErrorState as="h2" error={logs.error} onRetry={() => void logs.refetch()} />
			) : (
				<Card padding="compact" aria-busy={logs.isPending}>
					{logs.isPending ? <Skeleton className="h-64 w-full" /> : <LogLines lines={logs.data.lines} />}
				</Card>
			)}

			<p className="text-muted-foreground text-xs">
				Anything that looked like a token, a password or a connection string was removed before the line was stored.
			</p>
		</div>
	);
}

/** Says what is on screen and what is behind it, so nobody reads a truncated list as the whole buffer. */
function summarise(feed: LogFeed | undefined, paused: boolean, t: TFunction): string {
	if (feed === undefined) return t("owner.readingBuffer");

	const shown = t("owner.showing", { shown: feed.lines.length, matched: feed.matched });
	const held = t("owner.held", { buffered: feed.buffered, capacity: feed.capacity });

	return `${shown}, ${held}. ${paused ? t("owner.pausedFull") : t("owner.refreshing")}`;
}
