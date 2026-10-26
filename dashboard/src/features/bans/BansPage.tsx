import { BAN_LIMITS, type BanEntry, WARNING_LIMITS } from "@testify/shared";
import { Ban } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { Field, FIELD, Warning } from "@/components/form";
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
} from "@/components/primitives";
import { useBans, useUnban } from "@/features/bans/useBans";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useDebounced } from "@/hooks/useDebounced";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { dateAndTime } from "@/lib/datetime";
import { pageCount } from "@/lib/paging";
import { sanitiseInput } from "@/lib/sanitise";

/** Everybody banned from the server, as Discord holds them, with Unban beside each. */
export function BansPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();
	const overview = useGuildOverview(guildId);

	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const searched = useDebounced(query).trim();
	const list = useBans(guildId, { page, query: searched });

	usePageTitle(t("bans.title"), overview.data?.name);

	return (
		<>
			<PageHeader eyebrow={overview.data?.name} title={t("bans.title")} subtitle={t("bans.subtitle")} />

			<section aria-labelledby="bans-heading">
				<Card className="flex flex-col gap-4">
					<div>
						<h2 id="bans-heading" className={CARD_HEADING}>
							{t("bans.list")}
						</h2>
						{list.data?.readable === true && (
							<p className="text-muted-foreground text-sm" aria-live="polite">
								{t("bans.count", { count: list.data.total })}
							</p>
						)}
					</div>

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

					{list.isError ? (
						<ErrorState as="h2" error={list.error} onRetry={() => void list.refetch()} />
					) : list.data === undefined ? (
						<Skeleton className="h-48 w-full" />
					) : !list.data.readable ? (
						<Warning>{t("bans.unreadable")}</Warning>
					) : list.data.items.length === 0 ? (
						<EmptyState
							icon={<Ban size={28} />}
							title={searched === "" ? t("bans.emptyTitle") : t("bans.noMatchTitle")}
							body={searched === "" ? t("bans.emptyBody") : t("bans.noMatchBody")}
						/>
					) : (
						<DividedList>
							{list.data.items.map((entry) => (
								<BanRow key={entry.userId} guildId={guildId} entry={entry} />
							))}
						</DividedList>
					)}

					{list.data?.truncated === true && (
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

/** Unban opens a reason in the row itself, so the confirm sits beside the person it is about. */
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
					{unban.error !== null && (
						<Warning>{unban.error instanceof ApiError ? unban.error.message : t("common.couldNotSave")}</Warning>
					)}
				</form>
			)}
		</li>
	);
}
