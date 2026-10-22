import { errorRate, type AnalyticsWindow, type GuildUsageReport } from "@testify/shared";
import { ArrowLeft, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { LABEL, SearchField, SELECT, Warning } from "@/components/form";
import {
	Avatar,
	Badge,
	Button,
	Card,
	CARD_HEADING,
	CELL,
	CELL_NUM,
	DataTable,
	Figure,
	Pager,
	SegmentedControl,
	Skeleton,
	TH,
	TH_NUM,
	UsageBars,
	WIDE_ONLY,
} from "@/components/primitives";
import { UsageChart } from "@/features/owner/components/UsageChart";
import { UsagePanel } from "@/features/owner/components/UsagePanel";
import { commandFrom, percent, runName, searchWith, snowflakeFrom, WINDOWS } from "@/features/owner/owner.utils";
import { PER_PAGE, useGuildMembers, useGuildRuns, useGuildUsage } from "@/features/owner/useOwner";
import { useDebounced } from "@/hooks/useDebounced";
import { cn } from "@/lib/cn";
import { dateAndTime, since } from "@/lib/datetime";
import { pageCount, pageFrom } from "@/lib/paging";

const LARGE_ONLY = "hidden lg:table-cell";

/** Everything the drill-down keeps in the URL, cleared together on the way back to every server. */
const DRILL_DOWN = { guild: null, who: null, people: null, member: null, command: null, runs: null };

/** One server: what was run there, who ran it, and each run, newest first. */
export function GuildUsage({
	guildId,
	days,
	onWindow,
}: {
	guildId: string;
	days: AnalyticsWindow;
	onWindow: (days: AnalyticsWindow) => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [params] = useSearchParams();
	const report = useGuildUsage(guildId, days);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<Link
					to={searchWith(params, DRILL_DOWN)}
					className="text-accent inline-flex items-center gap-2 text-sm hover:underline"
				>
					<ArrowLeft size={14} aria-hidden="true" />
					{t("owner.allServers")}
				</Link>
				<SegmentedControl label={t("owner.window")} segments={WINDOWS} value={days} onChange={onWindow} />
			</div>

			{report.isError ? (
				<ErrorState as="h2" error={report.error} onRetry={() => void report.refetch()} />
			) : report.isPending ? (
				<Skeleton className="h-96 w-full" />
			) : (
				<>
					<Summary report={report.data} />
					{report.data.memberDays < days && (
						<Warning>{t("owner.memberDaysNote", { days: report.data.memberDays })}</Warning>
					)}
					<Members guildId={guildId} report={report.data} />
					<Runs guildId={guildId} report={report.data} />
				</>
			)}
		</div>
	);
}

function Summary({ report }: { report: GuildUsageReport }): React.JSX.Element {
	const { t } = useTranslation();
	const { guild } = report;

	return (
		<>
			<Card padding="none" className="divide-border divide-y">
				<div className="flex items-center gap-3 px-6 py-4">
					<Avatar name={guild.name} url={guild.iconUrl} size={40} seed={guild.guildId} />
					<div className="min-w-0">
						<h2 className="truncate text-base font-semibold">{guild.name}</h2>
						<p className="text-muted-foreground font-mono text-xs">{guild.guildId}</p>
					</div>
				</div>

				<dl className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0 [&>*]:border-border">
					<Figure className="px-6 py-4" label={t("owner.commandsRun")} value={report.runs.toLocaleString()} />
					<Figure
						className="px-6 py-4"
						label={t("owner.failed")}
						value={percent(report.failures, report.runs)}
						{...(errorRate(report) > 0.05 ? { tone: "text-destructive-text" } : {})}
					/>
					<Figure className="px-6 py-4" label={t("owner.activeMembers")} value={report.members.toLocaleString()} />
					<Figure
						className="px-6 py-4"
						label={t("owner.dashboardScreens")}
						value={report.dashboardViews.toLocaleString()}
					/>
				</dl>

				<div className="px-6 py-5">
					<UsageChart days={report.daily} />
				</div>
			</Card>

			<div className="grid items-start gap-4 lg:grid-cols-2">
				<UsagePanel title={t("owner.serverCommands")} hint={t("owner.serverCommandsHint")}>
					<UsageBars
						empty={t("owner.noCommandRun")}
						rows={report.commands.slice(0, 10).map((row) => ({
							id: row.command,
							label: `/${row.command}`,
							sub: row.failures > 0 ? `${row.category} · ${String(row.failures)} failed` : row.category,
							count: row.count,
						}))}
					/>
				</UsagePanel>

				<UsagePanel title={t("owner.howRun")} hint={t("owner.howRunHint")}>
					<UsageBars
						tint="bg-feature-levelling/25"
						empty={t("owner.nothingRecorded")}
						rows={[
							{ id: "slash", label: t("owner.slashCommands"), count: report.surfaces.slash },
							{ id: "prefix", label: t("owner.prefixCommands"), count: report.surfaces.prefix },
						]}
					/>
				</UsagePanel>
			</div>
		</>
	);
}

/** Everybody who ran a command there; pressing a name narrows the runs below to theirs. */
function Members({ guildId, report }: { guildId: string; report: GuildUsageReport }): React.JSX.Element {
	const { t } = useTranslation();
	const [params, setParams] = useSearchParams();
	const search = params.get("who") ?? "";
	const page = pageFrom(params.get("people"));
	const chosen = snowflakeFrom(params.get("member"));
	const members = useGuildMembers(guildId, report.days, page, useDebounced(search));

	function put(changes: Record<string, string | null>, replace = false): void {
		setParams(new URLSearchParams(searchWith(params, changes)), { replace });
	}

	return (
		<section aria-labelledby="members-heading" className="flex flex-col gap-3">
			<div>
				<h2 id="members-heading" className={CARD_HEADING}>
					{t("owner.whoRan")}
				</h2>
				<p className="text-muted-foreground text-xs">{t("owner.whoRanHint", { days: report.memberDays })}</p>
			</div>

			<SearchField
				label={t("owner.searchMembers")}
				placeholder={t("owner.searchMembersPlaceholder")}
				value={search}
				onChange={(next) => {
					put({ who: next === "" ? null : next, people: null }, true);
				}}
			/>

			{members.isError ? (
				<ErrorState as="h2" error={members.error} onRetry={() => void members.refetch()} />
			) : members.isPending ? (
				<Skeleton className="h-48 w-full" />
			) : (
				<>
					<DataTable
						caption={t("owner.membersCaption", { name: report.guild.name })}
						head={
							<>
								<th scope="col" className={TH}>
									{t("owner.member")}
								</th>
								<th scope="col" className={TH_NUM}>
									{t("owner.runs")}
								</th>
								<th scope="col" className={cn(TH, LARGE_ONLY)}>
									{t("owner.mostRun")}
								</th>
								<th scope="col" className={cn(TH_NUM, WIDE_ONLY)}>
									{t("owner.lastRun")}
								</th>
							</>
						}
					>
						{members.data.items.length === 0 && (
							<tr>
								<td colSpan={4} className={cn(CELL, "text-muted-foreground")}>
									{search.trim() === "" ? t("owner.noMemberRan") : t("owner.noMemberMatches")}
								</td>
							</tr>
						)}
						{members.data.items.map((member) => (
							<tr
								key={member.userId}
								className={cn(
									"transition-colors duration-150",
									chosen === member.userId ? "bg-muted/60" : "hover:bg-muted/40",
								)}
							>
								<td className={CELL}>
									<button
										type="button"
										aria-pressed={chosen === member.userId}
										onClick={() => {
											put({ member: chosen === member.userId ? null : member.userId, runs: null });
										}}
										className="hover:text-accent flex w-full min-w-0 items-center gap-2 text-left transition-colors duration-150"
									>
										<Avatar name={member.username} url={member.avatarUrl} size={24} seed={member.userId} />
										<span className="min-w-0">
											<span className="block truncate" title={member.username}>
												{member.username}
											</span>
											<span className="text-muted-foreground block truncate font-mono text-xs">{member.userId}</span>
										</span>
									</button>
								</td>
								<td className={CELL_NUM}>
									{member.runs.toLocaleString()}
									{member.failures > 0 && (
										<span className="text-destructive-text block text-xs">
											{t("owner.failedCount", { count: member.failures })}
										</span>
									)}
								</td>
								<td className={cn(CELL, LARGE_ONLY)}>
									<span className="flex flex-wrap gap-1">
										{member.topCommands.map((top) => (
											<Badge key={top.command}>
												/{top.command} · {top.count.toLocaleString()}
											</Badge>
										))}
										{member.commandCount > member.topCommands.length && (
											<Badge>
												{t("owner.moreCommands", { count: member.commandCount - member.topCommands.length })}
											</Badge>
										)}
									</span>
								</td>
								<td className={cn(CELL_NUM, "font-sans", WIDE_ONLY)} title={dateAndTime(member.lastAt)}>
									{since(member.lastAt)}
								</td>
							</tr>
						))}
					</DataTable>

					<Pager
						label={t("owner.whoRan")}
						page={page}
						pages={pageCount(members.data.total, PER_PAGE)}
						onChange={(next) => {
							put({ people: String(next) });
						}}
					/>
				</>
			)}
		</section>
	);
}

/** Every run, newest first, narrowed to one member or one command; what was typed into it is never kept. */
function Runs({ guildId, report }: { guildId: string; report: GuildUsageReport }): React.JSX.Element {
	const { t } = useTranslation();
	const [params, setParams] = useSearchParams();
	const page = pageFrom(params.get("runs"));
	const member = snowflakeFrom(params.get("member"));
	const command = commandFrom(params.get("command"));
	const runs = useGuildRuns(guildId, report.days, page, member, command);
	const memberName = runs.data?.items.find((run) => run.userId === member)?.username ?? member;

	function put(changes: Record<string, string | null>): void {
		setParams(new URLSearchParams(searchWith(params, changes)));
	}

	return (
		<section aria-labelledby="runs-heading" className="flex flex-col gap-3">
			<div>
				<h2 id="runs-heading" className={CARD_HEADING}>
					{t("owner.recentRuns")}
				</h2>
				<p className="text-muted-foreground text-xs">{t("owner.recentRunsHint")}</p>
			</div>

			<div className="flex flex-wrap items-end gap-3">
				<label className="flex w-full flex-col gap-1 sm:w-64">
					<span className={LABEL}>{t("owner.command")}</span>
					<select
						className={SELECT}
						value={command ?? ""}
						onChange={(event) => {
							put({ command: event.target.value === "" ? null : event.target.value, runs: null });
						}}
					>
						<option value="">{t("owner.allCommands")}</option>
						{report.commands.map((row) => (
							<option key={row.command} value={row.command}>
								/{row.command}
							</option>
						))}
					</select>
				</label>

				{member !== null && (
					<Button
						variant="secondary"
						onClick={() => {
							put({ member: null, runs: null });
						}}
					>
						{t("owner.onlyMember", { name: memberName })}
						<X size={14} aria-hidden="true" />
						<span className="sr-only">{t("owner.showEveryone")}</span>
					</Button>
				)}
			</div>

			{runs.isError ? (
				<ErrorState as="h2" error={runs.error} onRetry={() => void runs.refetch()} />
			) : runs.isPending ? (
				<Skeleton className="h-48 w-full" />
			) : (
				<>
					<DataTable
						caption={t("owner.runsCaption", { name: report.guild.name })}
						head={
							<>
								<th scope="col" className={cn(TH, "w-24 sm:w-32")}>
									{t("owner.when")}
								</th>
								<th scope="col" className={TH}>
									{t("owner.member")}
								</th>
								<th scope="col" className={TH}>
									{t("owner.command")}
								</th>
								<th scope="col" className={cn(TH, LARGE_ONLY)}>
									{t("owner.channel")}
								</th>
								<th scope="col" className={cn(TH_NUM, WIDE_ONLY)}>
									{t("owner.result")}
								</th>
							</>
						}
					>
						{runs.data.items.length === 0 && (
							<tr>
								<td colSpan={5} className={cn(CELL, "text-muted-foreground")}>
									{t("owner.noRuns")}
								</td>
							</tr>
						)}
						{runs.data.items.map((run, index) => (
							<tr key={`${run.at}-${run.userId}-${String(index)}`}>
								<td className={cn(CELL, "text-muted-foreground")} title={dateAndTime(run.at)}>
									{since(run.at)}
								</td>
								<td className={CELL}>
									<span className="block truncate" title={run.userId}>
										{run.username}
									</span>
								</td>
								<td className={CELL}>
									<span className="block truncate font-mono text-xs" title={runName(run)}>
										{runName(run)}
									</span>
									<span className="text-muted-foreground text-xs">
										{run.surface === "slash" ? t("owner.viaSlash") : t("owner.viaPrefix")}
									</span>
								</td>
								<td className={cn(CELL, LARGE_ONLY)}>
									<span className="block truncate">
										{run.channelName === null ? t("owner.unknownChannel") : `#${run.channelName}`}
									</span>
								</td>
								<td className={cn(CELL_NUM, WIDE_ONLY)}>
									<span className="flex flex-col items-end gap-1">
										<Badge tone={run.failed ? "danger" : "success"}>
											{run.failed ? t("owner.failed") : t("owner.worked")}
										</Badge>
										<span className="text-muted-foreground text-xs">{`${run.durationMs.toLocaleString()} ms`}</span>
									</span>
								</td>
							</tr>
						))}
					</DataTable>

					<Pager
						label={t("owner.recentRuns")}
						page={page}
						pages={pageCount(runs.data.total, PER_PAGE)}
						onChange={(next) => {
							put({ runs: String(next) });
						}}
					/>
				</>
			)}
		</section>
	);
}
