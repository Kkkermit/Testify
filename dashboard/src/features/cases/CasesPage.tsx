import { type CaseAction, CASE_LIMITS, type ModCase } from "@testify/shared";
import { Gavel } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { ChannelPicker, Field, FIELD, SavingIndicator, savingStateOf, SELECT, Warning } from "@/components/form";
import {
	Badge,
	Card,
	CARD_HEADING,
	DividedList,
	EmptyState,
	PageHeader,
	Pager,
	Skeleton,
} from "@/components/primitives";
import { ACTION_LABELS, ACTION_ORDER, durationText, isCaseAction } from "@/features/cases/cases.utils";
import { useCases, useCaseSettings, useUpdateCaseSettings } from "@/features/cases/useCases";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels } from "@/features/levelling/useLevelling";
import { useDebounced } from "@/hooks/useDebounced";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { dateAndTime } from "@/lib/datetime";
import { pageCount } from "@/lib/paging";

/** Every warning, timeout, kick, ban and softban in the server, numbered, and where new ones are posted. */
export function CasesPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();
	const overview = useGuildOverview(guildId);

	usePageTitle(t("cases.title"), overview.data?.name);

	return (
		<>
			<PageHeader eyebrow={overview.data?.name} title={t("cases.title")} subtitle={t("cases.subtitle")} />
			<LogCard guildId={guildId} />
			<CaseList guildId={guildId} />
		</>
	);
}

function LogCard({ guildId }: { guildId: string }): React.JSX.Element {
	const { t } = useTranslation();
	const settings = useCaseSettings(guildId);
	const channels = useChannels(guildId);
	const update = useUpdateCaseSettings(guildId);

	if (settings.isError) return <ErrorState as="h2" error={settings.error} onRetry={() => void settings.refetch()} />;
	if (settings.isPending) return <Skeleton className="h-36 w-full" />;

	return (
		<Card className="motion-pop flex flex-col gap-4">
			<div className="flex items-center justify-between gap-3">
				<h2 className={CARD_HEADING}>{t("cases.log")}</h2>
				<SavingIndicator state={savingStateOf(update.isPending, update.isSuccess)} />
			</div>
			<ChannelPicker
				label={t("cases.logChannel")}
				hint={t("cases.logHint")}
				channels={channels.data ?? []}
				value={settings.data.logChannelId}
				noneLabel={t("cases.noLog")}
				onChange={(logChannelId) => {
					update.mutate({ logChannelId });
				}}
			/>
			{settings.data.logChannelId !== null && !settings.data.canSend && <Warning>{t("cases.cannotSend")}</Warning>}
			{update.error !== null && (
				<Warning>{update.error instanceof ApiError ? update.error.message : t("common.couldNotSave")}</Warning>
			)}
		</Card>
	);
}

function CaseList({ guildId }: { guildId: string }): React.JSX.Element {
	const { t } = useTranslation();
	const [query, setQuery] = useState("");
	const [action, setAction] = useState<CaseAction | null>(null);
	const [page, setPage] = useState(1);
	const searched = useDebounced(query).trim();
	const list = useCases(guildId, { page, query: searched, action });

	return (
		<section aria-labelledby="cases-heading" className="flex flex-col gap-3">
			<Card className="flex flex-col gap-4">
				<div>
					<h2 id="cases-heading" className={CARD_HEADING}>
						{t("cases.list")}
					</h2>
					{list.data !== undefined && (
						<p className="text-muted-foreground text-sm" aria-live="polite">
							{t("cases.count", { count: list.data.total })}
						</p>
					)}
				</div>

				<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
					<Field label={t("cases.search")} hint={t("cases.searchHint")} htmlFor="cases-search">
						<input
							id="cases-search"
							type="search"
							className={FIELD}
							value={query}
							maxLength={CASE_LIMITS.maxQuery}
							autoComplete="off"
							onChange={(event) => {
								setQuery(event.target.value);
								setPage(1);
							}}
						/>
					</Field>
					<Field label={t("cases.action")} htmlFor="cases-action">
						<select
							id="cases-action"
							className={SELECT}
							value={action ?? ""}
							onChange={(event) => {
								setAction(isCaseAction(event.target.value) ? event.target.value : null);
								setPage(1);
							}}
						>
							<option value="">{t("cases.anyAction")}</option>
							{ACTION_ORDER.map((entry) => (
								<option key={entry} value={entry}>
									{t(ACTION_LABELS[entry])}
								</option>
							))}
						</select>
					</Field>
				</div>

				{list.isError ? (
					<ErrorState as="h2" error={list.error} onRetry={() => void list.refetch()} />
				) : list.data === undefined ? (
					<Skeleton className="h-48 w-full" />
				) : list.data.items.length === 0 ? (
					<EmptyState icon={<Gavel size={28} />} title={t("cases.emptyTitle")} body={t("cases.emptyBody")} />
				) : (
					<DividedList>
						{list.data.items.map((modCase) => (
							<CaseRow
								key={`${String(modCase.number)}:${modCase.at}:${modCase.userId}`}
								guildId={guildId}
								modCase={modCase}
							/>
						))}
					</DividedList>
				)}

				{list.data !== undefined && (
					<Pager
						page={list.data.page}
						pages={pageCount(list.data.total, list.data.perPage)}
						onChange={setPage}
						label={t("cases.list")}
					/>
				)}
			</Card>
		</section>
	);
}

function CaseRow({ guildId, modCase }: { guildId: string; modCase: ModCase }): React.JSX.Element {
	const { t, i18n } = useTranslation();

	return (
		<li className="flex flex-col gap-1 px-4 py-3">
			<div className="flex flex-wrap items-center gap-2">
				<span className="text-sm font-semibold tabular-nums">
					{modCase.number === null ? t("cases.earlier") : t("cases.number", { number: modCase.number })}
				</span>
				<Badge>{t(ACTION_LABELS[modCase.action])}</Badge>
				<Link
					to={`/guilds/${guildId}/members/${modCase.userId}`}
					className="hover:text-accent text-sm font-medium transition-colors duration-150"
				>
					{modCase.username}
				</Link>
			</div>
			<p className="text-sm break-words">{modCase.reason}</p>
			<p className="text-muted-foreground text-xs">
				{t("cases.by", { name: modCase.moderatorName, when: dateAndTime(modCase.at) })}
				{modCase.durationMs !== null &&
					` · ${t("cases.for", { length: durationText(modCase.durationMs, i18n.language) })}`}
			</p>
		</li>
	);
}
