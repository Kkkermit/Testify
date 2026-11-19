import { type RunRow, type RunsFilters, type RunsPage, TOP_RUNNER_WINDOWS, type TopRunners } from "@testify/shared";
import { X } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { FIELD, LABEL, Warning } from "@/components/form";
import { Avatar, Badge, Button, Card, DividedList, SegmentedControl } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { useCommands } from "@/features/commands/useCommands";
import { type ProblemWords, ShardlensLinks } from "@/features/owner/components/AnalyticsNotice";
import { AnalyticsState } from "@/features/owner/components/AnalyticsState";
import { UsagePanel as Panel } from "@/features/owner/components/UsagePanel";
import { formatMs } from "@/features/owner/owner.utils";
import { CommandSelect } from "@/features/owner/usage/CommandSelect";
import {
	choiceOf,
	idFromLookup,
	kindLabel,
	narrowed,
	OUTCOME_CHOICE_LABELS,
	OUTCOME_CHOICES,
	OUTCOME_LABELS,
	OUTCOME_TONES,
	runWhat,
} from "@/features/owner/usage/runs.utils";
import { useRuns, useTopRunners } from "@/features/owner/useOwner";
import { cn } from "@/lib/cn";
import { dateAndTime } from "@/lib/datetime";

/** Read with the activity key, so each reason names that key rather than the read key. */
const WHY: ProblemWords = {
	off: "owner.runs.off",
	refused: "owner.runs.refused",
	unreachable: "owner.analyticsUnreachable",
	audit_off: "owner.analyticsAuditOff",
};

const LINK = cn(INLINE_TARGET, "hover:text-accent text-left hover:underline");

/** A server is narrowed to with its name, which the filter alone does not carry. */
type Narrow = (change: Partial<Record<keyof RunsFilters, string | null>>, serverName?: string) => void;

export function RunsView({ days }: { days: number }): React.JSX.Element {
	const { t } = useTranslation();
	const [filters, setFilters] = useState<RunsFilters>({});
	const [serverName, setServerName] = useState<string | null>(null);
	const [pages, setPages] = useState<string[]>([]);
	const runs = useRuns(days, filters, pages.at(-1) ?? null);

	const narrow: Narrow = (change, name) => {
		setFilters((current) => narrowed(current, change));
		if (name !== undefined) setServerName(name);
		setPages([]);
	};

	return (
		<div className="flex flex-col gap-4">
			<p className="text-muted-foreground text-sm">{t("owner.runs.hint")}</p>
			<RunFilters filters={filters} serverName={serverName} onNarrow={narrow} />

			<div className="grid items-start gap-4 lg:grid-cols-3">
				<div className="flex min-w-0 flex-col gap-3 lg:col-span-2">
					<AnalyticsState query={runs} why={WHY}>
						{(page) => (
							<>
								<RunList page={page} onNarrow={narrow} />
								<div className="flex justify-between gap-3">
									<Button
										variant="secondary"
										disabled={pages.length === 0}
										onClick={() => {
											setPages((current) => current.slice(0, -1));
										}}
									>
										{t("owner.runs.newer")}
									</Button>
									<Button
										variant="secondary"
										disabled={page.next === null}
										onClick={() => {
											const next = page.next;
											if (next !== null) setPages((current) => [...current, next]);
										}}
									>
										{t("owner.runs.older")}
									</Button>
								</div>
								<ShardlensLinks collector={page.collector} />
							</>
						)}
					</AnalyticsState>
				</div>
				<TopRunnersPanel
					onPick={(userId) => {
						narrow({ userId });
					}}
				/>
			</div>
		</div>
	);
}

function RunFilters({
	filters,
	serverName,
	onNarrow,
}: {
	filters: RunsFilters;
	serverName: string | null;
	onNarrow: Narrow;
}): React.JSX.Element {
	const { t } = useTranslation();
	const commands = useCommands();
	const names = (commands.data?.commands ?? []).map((command) => command.name).sort();
	const lookupId = useId();
	const [lookup, setLookup] = useState("");
	const [wrong, setWrong] = useState(false);

	return (
		<Card padding="compact" className="flex flex-col gap-4">
			<div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<div className="flex min-w-0 flex-col gap-1">
					<span className={LABEL}>{t("owner.runs.outcome")}</span>
					<SegmentedControl
						label={t("owner.runs.outcome")}
						segments={OUTCOME_CHOICES.map((value) => ({ value, label: t(OUTCOME_CHOICE_LABELS[value]) }))}
						value={choiceOf(filters)}
						onChange={(value) => {
							onNarrow({ outcome: value === "all" ? null : value });
						}}
					/>
				</div>
				<CommandSelect
					label={t("owner.runs.command")}
					value={filters.command ?? null}
					names={names}
					anything={t("owner.runs.anyCommand")}
					onChange={(command) => {
						onNarrow({ command });
					}}
				/>
				{/* No name and no action: the id is never submitted anywhere, so it can never land in an address. */}
				<form
					className="flex min-w-0 flex-col gap-1"
					onSubmit={(event) => {
						event.preventDefault();
						const userId = idFromLookup(lookup);
						setWrong(userId === null);
						if (userId !== null) onNarrow({ userId });
					}}
				>
					<label htmlFor={lookupId} className={LABEL}>
						{t("owner.runs.person")}
					</label>
					<div className="flex gap-2">
						<input
							id={lookupId}
							className={cn(FIELD, "min-w-0 flex-1 font-mono")}
							inputMode="numeric"
							autoComplete="off"
							placeholder={t("owner.runs.personPlaceholder")}
							value={lookup}
							onChange={(event) => {
								setLookup(event.target.value);
								setWrong(false);
							}}
						/>
						<Button type="submit" variant="secondary">
							{t("owner.runs.lookUp")}
						</Button>
					</div>
				</form>
			</div>

			{wrong && <Warning>{t("owner.runs.notAnId")}</Warning>}

			{(filters.userId !== undefined || filters.guildId !== undefined) && (
				<ul className="flex flex-wrap gap-2" aria-label={t("owner.runs.narrowedBy")}>
					{filters.userId !== undefined && (
						<Chip
							label={t("owner.runs.onlyPerson", { id: filters.userId })}
							onClear={() => {
								setLookup("");
								onNarrow({ userId: null });
							}}
						/>
					)}
					{filters.guildId !== undefined && (
						<Chip
							label={t("owner.runs.onlyServer", { name: serverName ?? filters.guildId })}
							onClear={() => {
								onNarrow({ guildId: null });
							}}
						/>
					)}
				</ul>
			)}
		</Card>
	);
}

function Chip({ label, onClear }: { label: string; onClear: () => void }): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<li className="border-border rounded-chip flex items-center gap-1 border py-0.5 pr-1 pl-2 text-sm">
			<span className="font-mono">{label}</span>
			<Button
				variant="ghost"
				className="size-7 p-0"
				aria-label={t("owner.runs.clear", { what: label })}
				onClick={onClear}
			>
				<X size={14} aria-hidden="true" />
			</Button>
		</li>
	);
}

function RunList({ page, onNarrow }: { page: RunsPage; onNarrow: Narrow }): React.JSX.Element {
	const { t } = useTranslation();

	if (page.rows.length === 0) {
		return (
			<Card>
				<p className="text-muted-foreground text-sm">{t("owner.runs.empty")}</p>
			</Card>
		);
	}

	return (
		<DividedList aria-label={t("owner.runs.listLabel")} className="bg-card">
			{page.rows.map((row) => (
				<RunItem key={row.id} row={row} onNarrow={onNarrow} />
			))}
		</DividedList>
	);
}

function RunItem({ row, onNarrow }: { row: RunRow; onNarrow: Narrow }): React.JSX.Element {
	const { t } = useTranslation();
	const who = row.username ?? row.userId ?? t("owner.runs.unknownPerson");
	const what = runWhat(row);
	const kind = kindLabel(row.kind);

	return (
		<li className="flex items-start gap-3 px-4 py-3">
			<Avatar name={who} url={row.avatarUrl} size={32} seed={row.userId ?? row.id} />
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<p className="flex min-w-0 flex-wrap items-baseline gap-x-2">
					{row.userId === null ? (
						<span className="text-muted-foreground text-sm">{who}</span>
					) : (
						<button
							type="button"
							className={cn(LINK, "font-medium wrap-anywhere")}
							aria-label={t("owner.runs.onlyRunsBy", { name: who })}
							onClick={() => {
								onNarrow({ userId: row.userId });
							}}
						>
							{who}
						</button>
					)}
					{row.userId !== null && row.username !== null && (
						<span className="text-muted-foreground font-mono text-xs">{row.userId}</span>
					)}
				</p>
				<p className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-sm">
					{what !== null && <code className="font-mono wrap-anywhere">{what}</code>}
					{kind !== null && <span className="text-muted-foreground text-xs">{t(kind)}</span>}
					<span className="text-muted-foreground" aria-hidden="true">
						·
					</span>
					{row.guildId === null ? (
						<span className="text-muted-foreground">{t("owner.runs.directMessages")}</span>
					) : (
						<button
							type="button"
							className={cn(LINK, "wrap-anywhere")}
							aria-label={t("owner.runs.onlyRunsIn", { name: row.guildName ?? row.guildId })}
							onClick={() => {
								onNarrow({ guildId: row.guildId }, row.guildName ?? row.guildId ?? undefined);
							}}
						>
							{row.guildName ?? row.guildId}
						</button>
					)}
				</p>
				<p className="text-muted-foreground text-xs tabular-nums">
					<time dateTime={row.at}>{dateAndTime(row.at)}</time>
					{row.answerMs !== null && <> · {t("owner.runs.answered", { time: formatMs(row.answerMs) })}</>}
				</p>
			</div>
			<Badge tone={OUTCOME_TONES[row.outcome]}>{t(OUTCOME_LABELS[row.outcome])}</Badge>
		</li>
	);
}

const WINDOW_LABELS = { "24h": "owner.runs.top24h", "7d": "owner.runs.top7d" } as const;

function TopRunnersPanel({ onPick }: { onPick: (userId: string) => void }): React.JSX.Element {
	const { t } = useTranslation();
	const [window, setWindow] = useState<TopRunners["window"]>("24h");
	const top = useTopRunners(window);

	return (
		<Panel title={t("owner.runs.topTitle")} hint={t("owner.runs.topHint")}>
			<SegmentedControl
				label={t("owner.runs.topWindow")}
				segments={TOP_RUNNER_WINDOWS.map((value) => ({ value, label: t(WINDOW_LABELS[value]) }))}
				value={window}
				onChange={setWindow}
			/>
			<AnalyticsState query={top} why={WHY}>
				{(answer) =>
					answer.rows.length === 0 ? (
						<p className="text-muted-foreground text-sm">{t("owner.runs.noTop")}</p>
					) : (
						<ol className="flex flex-col gap-2">
							{answer.rows.map((row, index) => {
								const name = row.username ?? row.userId ?? t("owner.runs.unknownPerson");
								return (
									<li key={row.userId ?? `unknown-${String(index)}`} className="flex items-center gap-3">
										<Avatar name={name} url={row.avatarUrl} size={28} seed={row.userId ?? String(index)} />
										<span className="min-w-0 flex-1 truncate text-sm">{name}</span>
										<span className="text-muted-foreground text-sm tabular-nums">
											{t("owner.runs.runsCount", { count: row.runs })}
										</span>
										{row.userId !== null && (
											<Button
												variant="ghost"
												className="px-2 py-1 text-xs"
												aria-label={t("owner.runs.onlyRunsBy", { name })}
												onClick={() => {
													if (row.userId !== null) onPick(row.userId);
												}}
											>
												{t("owner.runs.theirRuns")}
											</Button>
										)}
									</li>
								);
							})}
						</ol>
					)
				}
			</AnalyticsState>
		</Panel>
	);
}
