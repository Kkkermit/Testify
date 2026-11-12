import { LOG_LEVELS, LOG_LEVEL_RANK, type LogFeed, type LogRun, type ReportedLogLevel } from "@testify/shared";
import { type TFunction } from "i18next";
import { Pause, Play, Trash2 } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { ErrorState } from "@/app/ErrorState";
import { useUndo } from "@/app/undo";
import { SearchField, Warning } from "@/components/form";
import { Button, Card, type Segment, SegmentedControl, Skeleton } from "@/components/primitives";
import { LogLines } from "@/features/owner/components/LogLines";
import { LogRunList } from "@/features/owner/components/LogRunList";
import { useDeleteLogs, useLogRuns, useLogs } from "@/features/owner/useOwner";
import { useDebounced } from "@/hooks/useDebounced";
import { type TranslationKey } from "@/i18n";
import { dateAndTime } from "@/lib/datetime";

/** Written out, because engines disagree on whether `text-transform` changes an accessible name. */
const LEVELS: Record<ReportedLogLevel, { label: TranslationKey; hint: TranslationKey }> = {
	trace: { label: "owner.levelAll", hint: "owner.levelTrace" },
	debug: { label: "owner.levelDebugName", hint: "owner.levelDebug" },
	info: { label: "owner.levelInfoName", hint: "owner.levelInfo" },
	warn: { label: "owner.levelWarnName", hint: "owner.levelWarn" },
	error: { label: "owner.levelErrorName", hint: "owner.levelError" },
	fatal: { label: "owner.levelFatalName", hint: "owner.levelFatal" },
};

const keyOf = (run: string): string => `logs:${run}`;

export function LogsTab({
	run,
	level,
	search,
	paused,
	onRun,
	onLevel,
	onSearch,
	onPause,
}: {
	/** A past run's id, or null for the run going now. */
	run: string | null;
	level: ReportedLogLevel;
	search: string;
	paused: boolean;
	onRun: (run: string | null) => void;
	onLevel: (level: ReportedLogLevel) => void;
	onSearch: (search: string) => void;
	onPause: (paused: boolean) => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const undo = useUndo();
	const remove = useDeleteLogs();
	const searched = useDebounced(search);
	const runs = useLogRuns(level, searched, paused);

	// Clearing the run going now empties it rather than taking it off the list.
	const listed = runs.data?.runs.filter((entry) => entry.current || !undo.isHidden(keyOf(entry.id)));
	const current = listed?.find((entry) => entry.current);
	// A past run that has since been deleted, or dropped by a seventh start, falls back to the run going now.
	const chosen =
		run === null || runs.isError
			? run
			: listed === undefined
				? undefined
				: listed.some((e) => e.id === run)
					? run
					: null;
	const logs = useLogs(chosen ?? null, level, searched, paused, chosen !== undefined);
	const past = chosen !== null && chosen !== undefined;
	const shownRun = listed?.find((entry) => (past ? entry.id === chosen : entry.current));

	const levelSegments: Segment<ReportedLogLevel>[] = LOG_LEVELS.map((value) => ({
		value,
		label: t(LEVELS[value].label),
		hint: t(LEVELS[value].hint),
	}));

	function deleteShown(target: LogRun): void {
		if (!target.current) onRun(null);
		undo.schedule({
			key: keyOf(target.id),
			label: target.current ? t("undo.logsNow") : t("undo.logsPast", { time: dateAndTime(target.startedAt) }),
			commit: () => remove.mutateAsync(target.id),
		});
	}

	const cleared = current !== undefined && !past && undo.isHidden(keyOf(current.id));

	return (
		<div className="flex flex-col gap-4">
			<Card padding="compact" className="flex flex-col gap-3">
				{runs.isError ? (
					<ErrorState as="h2" error={runs.error} onRetry={() => void runs.refetch()} />
				) : listed === undefined ? (
					<Skeleton className="h-40 w-full" />
				) : (
					<LogRunList
						runs={listed}
						kept={runs.data?.kept ?? 0}
						chosen={past ? chosen : null}
						searching={searched.trim() !== ""}
						onChoose={(entry) => {
							onRun(entry.current ? null : entry.id);
						}}
					/>
				)}
				{runs.data?.pastUnavailable === true && <Warning>{t("owner.runsUnavailable")}</Warning>}
			</Card>

			<Card padding="compact" className="flex flex-wrap items-center gap-3">
				<SearchField
					className="min-w-52 flex-1"
					label={t("owner.searchLog")}
					placeholder={t("owner.searchLogPlaceholder")}
					value={search}
					onChange={onSearch}
				/>

				{/* Six levels do not fit one row on a phone, so they sit as two even rows of three there. */}
				<SegmentedControl
					className="grid w-full grid-cols-3 sm:flex sm:w-auto"
					label={t("owner.minimumLevel")}
					segments={levelSegments}
					value={level}
					onChange={onLevel}
				/>

				<div className="flex flex-wrap gap-2">
					{!past && (
						<Button
							variant="ghost"
							onClick={() => {
								onPause(!paused);
							}}
						>
							{paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
							{paused ? t("owner.logsResume") : t("owner.logsPause")}
						</Button>
					)}
					{shownRun !== undefined && (
						<Button
							variant="ghost"
							disabled={cleared}
							onClick={() => {
								deleteShown(shownRun);
							}}
						>
							<Trash2 size={15} aria-hidden="true" />
							{shownRun.current ? t("owner.logsClear") : t("owner.logsDelete")}
						</Button>
					)}
				</div>
			</Card>

			<p className="text-muted-foreground text-sm" aria-live="polite">
				{summarise(logs.data, past, paused, t)}
			</p>

			{!past && logs.data !== undefined && LOG_LEVEL_RANK[logs.data.loggerLevel] > LOG_LEVEL_RANK[level] && (
				<Warning>
					<Trans
						i18nKey="owner.levelFloor"
						values={{ level: `LOG_LEVEL=${logs.data.loggerLevel}` }}
						components={{ level: <span className="font-mono" /> }}
					/>
				</Warning>
			)}

			{/* An unreadable feed must not render as an empty one — this is the screen you open when things are wrong. */}
			{logs.isError ? (
				<ErrorState as="h2" error={logs.error} onRetry={() => void logs.refetch()} />
			) : (
				<Card padding="compact" aria-busy={logs.isPending}>
					{logs.isPending ? (
						<Skeleton className="h-64 w-full" />
					) : (
						<LogLines lines={cleared ? [] : logs.data.lines} past={past} />
					)}
				</Card>
			)}

			<p className="text-muted-foreground text-xs">{t("owner.redactedNote")}</p>
		</div>
	);
}

function summarise(feed: LogFeed | undefined, past: boolean, paused: boolean, t: TFunction): string {
	if (feed === undefined) return t("owner.readingBuffer");

	const shown = t("owner.showing", { shown: feed.lines.length, matched: feed.matched });
	const held = t("owner.held", { buffered: feed.buffered, capacity: feed.capacity });
	if (past) return `${shown}, ${held}.`;

	return `${shown}, ${held}. ${paused ? t("owner.pausedFull") : t("owner.refreshing")}`;
}
