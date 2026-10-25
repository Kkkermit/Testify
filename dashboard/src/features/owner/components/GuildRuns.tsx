import { type GuildUsageReport } from "@testify/shared";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { LABEL, SELECT } from "@/components/form";
import {
	Badge,
	Button,
	CARD_HEADING,
	CELL,
	CELL_NUM,
	DataTable,
	LARGE_ONLY,
	Pager,
	Skeleton,
	TH,
	TH_NUM,
	WIDE_ONLY,
} from "@/components/primitives";
import { commandFrom, formatMs, runName, searchWith, snowflakeFrom } from "@/features/owner/owner.utils";
import { PER_PAGE, useGuildRuns } from "@/features/owner/useOwner";
import { cn } from "@/lib/cn";
import { dateAndTime, since } from "@/lib/datetime";
import { pageCount, pageFrom } from "@/lib/paging";

/** Every run, newest first, narrowed to one member or one command; what was typed into it is never kept. */
export function GuildRuns({ guildId, report }: { guildId: string; report: GuildUsageReport }): React.JSX.Element {
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
										{run.failed && run.reference !== null ? (
											<Link
												to={searchWith(params, { tab: "logs", q: run.reference, level: null })}
												className="hover:text-accent inline-flex items-center gap-2 transition-colors duration-150"
											>
												<Badge tone="danger">{t("owner.failed")}</Badge>
												<span className="font-mono text-xs underline">{run.reference}</span>
												<span className="sr-only">{t("owner.showInLog")}</span>
											</Link>
										) : (
											<Badge tone={run.failed ? "danger" : "success"}>
												{run.failed ? t("owner.failed") : t("owner.worked")}
											</Badge>
										)}
										<span className="text-muted-foreground text-xs">{formatMs(run.durationMs)}</span>
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
