import { type AppealFilter } from "@testify/shared";
import { Scale } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { postableChannels, Refusal, SavingIndicator, savingStateOf, Warning } from "@/components/form";
import {
	Card,
	EmptyState,
	PageHeader,
	Pager,
	SectionHeading,
	SegmentedControl,
	Skeleton,
	Summary,
} from "@/components/primitives";
import { appealFilterFrom, appealSummary } from "@/features/appeals/appeals.utils";
import { AppealItem, APPEAL_STATUS_LABEL } from "@/features/appeals/components/AppealItem";
import { AppealSettingsRows } from "@/features/appeals/components/AppealSettingsRows";
import {
	useAppealList,
	useAppealSettings,
	useDecideAppeal,
	useSaveAppealSettings,
} from "@/features/appeals/useAppeals";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels } from "@/features/levelling/useLevelling";
import { usePageTitle } from "@/hooks/usePageTitle";
import { type TranslationKey } from "@/i18n";
import { channelLabel } from "@/lib/channels";
import { pageCount, pageFrom } from "@/lib/paging";

const FILTERS: readonly AppealFilter[] = ["open", "accepted", "refused", "all"];

const FILTER_LABEL: Record<AppealFilter, TranslationKey> = { ...APPEAL_STATUS_LABEL, all: "appeals.filterAll" };

export function BanAppealsPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();
	const [params, setParams] = useSearchParams();
	const filter = appealFilterFrom(params.get("status"));
	const page = pageFrom(params.get("page"));

	const settings = useAppealSettings(guildId);
	const list = useAppealList(guildId, filter, page);
	const channels = useChannels(guildId);
	const overview = useGuildOverview(guildId);
	const save = useSaveAppealSettings(guildId);
	const decide = useDecideAppeal(guildId);

	usePageTitle(t("appeals.title"), overview.data?.name);

	if (settings.isError) return <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />;
	if (settings.isPending) return <Skeleton className="h-96 w-full" />;

	const postable = postableChannels(channels.data ?? []);
	const channel = channelLabel(postable, settings.data.channelId, t);

	function showAppeals(next: { status?: AppealFilter; page?: number }): void {
		const query = new URLSearchParams(params);
		if (next.status !== undefined) {
			query.set("status", next.status);
			query.delete("page");
		}
		if (next.page !== undefined) query.set("page", String(next.page));
		setParams(query);
	}

	return (
		<>
			<PageHeader
				server={overview.data}
				title={t("appeals.title")}
				subtitle={t("appeals.subtitle")}
				action={<SavingIndicator state={savingStateOf(save.isPending || decide.isPending, save.isSuccess)} />}
			/>

			<Summary>{appealSummary(settings.data, channel, t)}</Summary>
			{settings.data.channelId !== null && !settings.data.canSend && (
				<Warning>{t("common.cannotPostIn", { channel })}</Warning>
			)}

			<AppealSettingsRows
				settings={settings.data}
				channels={postable}
				saving={save.isPending}
				onChange={(patch) => {
					save.mutate(patch);
				}}
			/>
			<Refusal error={save.error} />

			<section aria-labelledby="appeals-heading" className="flex flex-col gap-3">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<SectionHeading as="h2" id="appeals-heading">
						{t("appeals.listTitle")}
					</SectionHeading>
					<SegmentedControl
						label={t("appeals.filter")}
						value={filter}
						segments={FILTERS.map((value) => ({ value, label: t(FILTER_LABEL[value]) }))}
						onChange={(status) => {
							showAppeals({ status });
						}}
					/>
				</div>

				{list.isError ? (
					<ErrorState as="h2" error={list.error} onRetry={() => void list.refetch()} />
				) : list.data === undefined ? (
					<Skeleton className="h-48 w-full" />
				) : list.data.items.length === 0 ? (
					<Card>
						<EmptyState icon={<Scale size={28} />} title={t("appeals.emptyTitle")} body={t("appeals.emptyBody")} />
					</Card>
				) : (
					<ul className="flex flex-col gap-3">
						{list.data.items.map((appeal) => (
							<AppealItem
								key={appeal.id}
								appeal={appeal}
								busy={decide.isPending}
								onDecide={(decision) => {
									decide.mutate({ appealId: appeal.id, decision });
								}}
							/>
						))}
					</ul>
				)}

				{list.data !== undefined && (
					<Pager
						page={list.data.page}
						pages={pageCount(list.data.total, list.data.perPage)}
						onChange={(next) => {
							showAppeals({ page: next });
						}}
					/>
				)}
				<Refusal error={decide.error} />
			</section>
		</>
	);
}
