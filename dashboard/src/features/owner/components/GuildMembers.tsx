import { type GuildUsageReport } from "@testify/shared";
import { Ban } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { SearchField } from "@/components/form";
import {
	Avatar,
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
import { searchWith, snowflakeFrom } from "@/features/owner/owner.utils";
import { PER_PAGE, useGuildMembers } from "@/features/owner/useOwner";
import { useDebounced } from "@/hooks/useDebounced";
import { cn } from "@/lib/cn";
import { dateAndTime, since } from "@/lib/datetime";
import { formatNumber } from "@/lib/intl";
import { pageCount, pageFrom } from "@/lib/paging";

/** Everybody who ran a command there; pressing a name narrows the runs below to theirs. */
export function GuildMembers({ guildId, report }: { guildId: string; report: GuildUsageReport }): React.JSX.Element {
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
								<th scope="col" className={cn(TH_NUM, "w-28 sm:w-32")}>
									<span className="sr-only">{t("owner.actions")}</span>
								</th>
							</>
						}
					>
						{members.data.items.length === 0 && (
							<tr>
								<td colSpan={5} className={cn(CELL, "text-muted-foreground")}>
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
									{formatNumber(member.runs)}
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
												/{top.command} · {formatNumber(top.count)}
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
								<td className={cn(CELL_NUM, "font-sans")}>
									{/* Opens the blacklist with the ID filled in; the block itself still needs pressing there. */}
									<Button
										variant="ghost"
										className="px-3"
										aria-label={t("owner.blockMember", { name: member.username })}
										onClick={() => {
											put({ tab: "blacklist", block: member.userId });
										}}
									>
										<Ban size={14} aria-hidden="true" />
										{t("owner.block")}
									</Button>
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
