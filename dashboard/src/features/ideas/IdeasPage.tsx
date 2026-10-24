import { type IdeaFilter } from "@testify/shared";
import { Lightbulb } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { useUndo } from "@/app/undo";
import { postableChannels, SavingIndicator, savingStateOf, Warning } from "@/components/form";
import { Card, EmptyState, Eyebrow, PageHeader, Pager, SegmentedControl, Skeleton } from "@/components/primitives";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { IdeaItem } from "@/features/ideas/components/IdeaItem";
import { IdeaSettingsCard } from "@/features/ideas/components/IdeaSettingsCard";
import { ideaFilterFrom, pageCount, pageFrom } from "@/features/ideas/ideas.utils";
import {
	useDecideIdea,
	useIdeaList,
	useIdeaSettings,
	useRemoveIdea,
	useSaveIdeaSettings,
} from "@/features/ideas/useIdeas";
import { useChannels } from "@/features/levelling/useLevelling";
import { usePageTitle } from "@/hooks/usePageTitle";
import { type TranslationKey } from "@/i18n";
import { ApiError } from "@/lib/api";

const FILTER_LABEL: Record<IdeaFilter, TranslationKey> = {
	all: "ideas.filterAll",
	open: "ideas.filterOpen",
	accepted: "ideas.filterAccepted",
	declined: "ideas.filterDeclined",
};

/** The server's idea board: where it posts, and every idea with its votes and the decision on it. */
export function IdeasPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();
	const [params, setParams] = useSearchParams();
	const filter = ideaFilterFrom(params.get("status"));
	const page = pageFrom(params.get("page"));

	const settings = useIdeaSettings(guildId);
	const list = useIdeaList(guildId, filter, page);
	const channels = useChannels(guildId);
	const overview = useGuildOverview(guildId);
	const save = useSaveIdeaSettings(guildId);
	const decide = useDecideIdea(guildId);
	const remove = useRemoveIdea(guildId);
	const undo = useUndo();

	usePageTitle(t("ideas.title"), overview.data?.name);

	if (settings.isError) return <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />;
	if (settings.isPending) return <Skeleton className="h-96 w-full" />;

	const message = (error: Error | null, fallback: string): string | null =>
		error === null ? null : error instanceof ApiError ? error.message : fallback;
	const busy = decide.isPending || remove.isPending;
	const counts = settings.data.counts;
	const countOf = (value: IdeaFilter): number =>
		value === "all" ? counts.open + counts.accepted + counts.declined : counts[value];

	function go(next: { status?: IdeaFilter; page?: number }): void {
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
				eyebrow={overview.data?.name}
				title={t("ideas.title")}
				subtitle={t("ideas.subtitle")}
				action={<SavingIndicator state={savingStateOf(save.isPending || busy, save.isSuccess)} />}
			/>

			<IdeaSettingsCard
				settings={settings.data}
				channels={postableChannels(channels.data ?? [])}
				saving={save.isPending}
				error={message(save.error, t("common.couldNotSave"))}
				onChange={(patch) => {
					save.mutate(patch);
				}}
			/>

			<section aria-labelledby="ideas-heading" className="flex flex-col gap-3">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<Eyebrow as="h2" id="ideas-heading">
						{t("ideas.posted")}
					</Eyebrow>
					<SegmentedControl
						label={t("ideas.filter")}
						value={filter}
						segments={(["all", "open", "accepted", "declined"] as const).map((value) => ({
							value,
							label: t(FILTER_LABEL[value], { count: countOf(value) }),
						}))}
						onChange={(status) => {
							go({ status });
						}}
					/>
				</div>

				{list.isError ? (
					<ErrorState as="h2" error={list.error} onRetry={() => void list.refetch()} />
				) : list.data === undefined ? (
					<Skeleton className="h-48 w-full" />
				) : list.data.items.length === 0 ? (
					<Card>
						<EmptyState
							icon={<Lightbulb size={28} />}
							title={t(filter === "all" ? "ideas.emptyTitle" : "ideas.noneHere")}
							body={t("ideas.emptyBody")}
						/>
					</Card>
				) : (
					<ul className="flex flex-col gap-3">
						{list.data.items
							.filter((idea) => !undo.isHidden(`idea:${guildId}:${idea.id}`))
							.map((idea) => (
								<IdeaItem
									key={idea.id}
									idea={idea}
									busy={busy}
									onDecide={(decision) => {
										decide.mutate({ ideaId: idea.id, decision });
									}}
									onRemove={() => {
										undo.schedule({
											key: `idea:${guildId}:${idea.id}`,
											label: t("undo.idea", { number: idea.number }),
											commit: () => remove.mutateAsync({ ideaId: idea.id }),
										});
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
							go({ page: next });
						}}
					/>
				)}

				{(decide.error ?? remove.error) !== null && (
					<Warning>
						{message(decide.error, t("common.couldNotSave")) ?? message(remove.error, t("common.couldNotRemove"))}
					</Warning>
				)}
			</section>
		</>
	);
}
