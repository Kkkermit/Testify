import { BAN_LIMITS, type BanEntry, WARNING_LIMITS } from "@testify/shared";
import { Ban } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { Field, FIELD, Refusal, Warning } from "@/components/form";
import {
	Avatar,
	Badge,
	Button,
	Card,
	CARD_HEADING,
	DividedList,
	EmptyState,
	PageHeader,
	Pager,
	Skeleton,
	Summary,
} from "@/components/primitives";
import { useBans, useUnban } from "@/features/bans/useBans";
import { NeedsPermission } from "@/features/guild-overview/components/NeedsPermission";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useHolds, useLacks } from "@/features/guild-overview/useLacks";
import { useDebounced } from "@/hooks/useDebounced";
import { usePageTitle } from "@/hooks/usePageTitle";
import { dateAndTime } from "@/lib/datetime";
import { pageCount } from "@/lib/paging";
import { currentData } from "@/lib/queries";
import { sanitiseInput } from "@/lib/sanitise";

export function BansPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();
	const overview = useGuildOverview(guildId);
	const blocked = useLacks(guildId)("BanMembers");
	const mayRead = useHolds(guildId)("BanMembers");

	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const searched = useDebounced(query).trim();
	const list = useBans(guildId, { page, query: searched }, mayRead);
	const results = currentData(list);
	const all = useBans(guildId, { page: 1, query: "" }, mayRead);

	usePageTitle(t("bans.title"), overview.data?.name);

	return (
		<>
			<PageHeader server={overview.data} title={t("bans.title")} subtitle={t("bans.subtitle")} />
			{all.data?.readable === true && (
				<Summary>{all.data.total === 0 ? t("bans.summaryNone") : t("bans.summary", { count: all.data.total })}</Summary>
			)}

			<section aria-labelledby="bans-heading">
				<Card className="flex flex-col gap-4">
					<div>
						<h2 id="bans-heading" className={CARD_HEADING}>
							{t("bans.list")}
						</h2>
						{blocked && <NeedsPermission permission="BanMembers" />}
						{results?.readable === true && (
							<p className="text-muted-foreground text-sm" aria-live="polite">
								{t("bans.count", { count: results.total })}
							</p>
						)}
					</div>

					{!blocked && (
						<Field label={t("bans.search")} hint={t("bans.searchHint")} htmlFor="bans-search">
							<input
								id="bans-search"
								type="search"
								className={FIELD}
								value={query}
								maxLength={BAN_LIMITS.maxQuery}
								autoComplete="off"
								onChange={(event) => {
									setQuery(event.target.value);
									setPage(1);
								}}
							/>
						</Field>
					)}

					{blocked ? null : list.isError ? (
						<ErrorState as="h2" error={list.error} onRetry={() => void list.refetch()} />
					) : results === undefined ? (
						<Skeleton className="h-48 w-full" />
					) : !results.readable ? (
						<Warning>{t("bans.unreadable")}</Warning>
					) : results.items.length === 0 ? (
						<EmptyState
							icon={<Ban size={28} />}
							title={searched === "" ? t("bans.emptyTitle") : t("bans.noMatchTitle")}
							body={searched === "" ? t("bans.emptyBody") : t("bans.noMatchBody")}
						/>
					) : (
						<DividedList>
							{results.items.map((entry) => (
								<BanRow key={entry.userId} guildId={guildId} entry={entry} />
							))}
						</DividedList>
					)}

					{results?.truncated === true && (
						<p className="text-muted-foreground text-sm">{t("bans.truncated", { max: BAN_LIMITS.maxRead })}</p>
					)}

					{list.data?.readable === true && (
						<Pager
							page={list.data.page}
							pages={pageCount(list.data.total, list.data.perPage)}
							onChange={setPage}
							label={t("bans.list")}
						/>
					)}
				</Card>
			</section>
		</>
	);
}

function BanRow({ guildId, entry }: { guildId: string; entry: BanEntry }): React.JSX.Element {
	const { t } = useTranslation();
	const unban = useUnban(guildId);
	const [confirming, setConfirming] = useState(false);
	const [reason, setReason] = useState("");
	const reasonId = `unban-reason-${entry.userId}`;

	return (
		<li className="flex flex-col gap-3 px-4 py-3">
			<div className="flex items-start gap-3">
				<Avatar name={entry.username} url={entry.avatarUrl} size={32} seed={entry.userId} />
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<div className="flex flex-wrap items-center gap-2">
						<span className="text-sm font-medium break-all">{entry.username}</span>
						<span className="text-muted-foreground font-mono text-xs">{entry.userId}</span>
						{entry.softbanEndsAt !== null && (
							<Badge tone="warning">{t("bans.softban", { when: dateAndTime(entry.softbanEndsAt) })}</Badge>
						)}
					</div>
					<p className="text-muted-foreground text-sm break-words">{entry.reason ?? t("bans.noReason")}</p>
				</div>
				{!confirming && (
					<Button
						variant="secondary"
						aria-label={t("bans.unbanName", { name: entry.username })}
						onClick={() => {
							setConfirming(true);
						}}
					>
						{t("bans.unban")}
					</Button>
				)}
			</div>

			{confirming && (
				<form
					className="flex flex-col gap-3 sm:pl-11"
					onSubmit={(event) => {
						event.preventDefault();
						const typed = sanitiseInput(reason).trim();
						unban.mutate({ userId: entry.userId, ...(typed === "" ? {} : { reason: typed }) });
					}}
				>
					<Field label={t("bans.reason")} hint={t("bans.reasonHint")} htmlFor={reasonId}>
						<input
							id={reasonId}
							className={FIELD}
							value={reason}
							maxLength={WARNING_LIMITS.maxReason}
							autoComplete="off"
							onChange={(event) => {
								setReason(event.target.value);
							}}
						/>
					</Field>
					<div className="flex flex-wrap items-center gap-3">
						<Button type="submit" disabled={unban.isPending}>
							{t("bans.confirm", { name: entry.username })}
						</Button>
						<Button
							variant="ghost"
							onClick={() => {
								setConfirming(false);
								unban.reset();
							}}
						>
							{t("common.cancel")}
						</Button>
					</div>
					<Refusal error={unban.error} />
				</form>
			)}
		</li>
	);
}
