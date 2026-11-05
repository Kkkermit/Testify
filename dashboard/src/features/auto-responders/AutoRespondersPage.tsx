import {
	AUTO_RESPONDER_LIMITS,
	type AutoResponder,
	autoResponderBlocked,
	type AutoResponderInput,
} from "@testify/shared";
import { MessageSquareReply, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { useUndo } from "@/app/undo";
import { RowActions, SavingIndicator, savingStateOf, SettingRows, Warning } from "@/components/form";
import { Button, Card, EmptyState, PageHeader, SectionHeading, Skeleton, Summary } from "@/components/primitives";
import { ResponderFields } from "@/features/auto-responders/components/ResponderFields";
import { ResponderRow } from "@/features/auto-responders/components/ResponderRow";
import {
	useAddAutoResponder,
	useAutoResponders,
	useEditAutoResponder,
	useRemoveAutoResponder,
} from "@/features/auto-responders/useAutoResponders";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { problemText } from "@/lib/problemText";
import { markupWarning, sanitiseInput } from "@/lib/sanitise";

const EMPTY: AutoResponderInput = { trigger: "", match: "word", reply: "" };

function cleaned(input: AutoResponderInput): AutoResponderInput {
	return { trigger: sanitiseInput(input.trigger), match: input.match, reply: sanitiseInput(input.reply) };
}

export function AutoRespondersPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();

	const list = useAutoResponders(guildId);
	const overview = useGuildOverview(guildId);
	const add = useAddAutoResponder(guildId);
	const edit = useEditAutoResponder(guildId);
	const remove = useRemoveAutoResponder(guildId);
	const undo = useUndo();

	usePageTitle(t("autoResponders.title"), overview.data?.name);

	const [draft, setDraft] = useState<AutoResponderInput>(EMPTY);

	if (list.isPending) return <Skeleton className="h-96 w-full" />;
	if (list.isError) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />;

	// A row waiting to be deleted still counts, so nothing can be added into the gap.
	const all = list.data.responders;
	const keyOf = (responder: AutoResponder): string => `auto-responder:${guildId}:${responder.id}`;
	const shown = all.filter((responder) => !undo.isHidden(keyOf(responder)));
	const full = all.length >= list.data.limit;
	const blocked = problemText(autoResponderBlocked(draft, all), t) ?? markupWarning(draft.reply);
	const saving = add.isPending || edit.isPending || remove.isPending;
	const said = (error: Error | null): string | null =>
		error === null ? null : error instanceof ApiError ? error.message : t("common.couldNotSave");

	function submit(): void {
		if (blocked !== null || full) return;
		add.mutate(cleaned(draft), {
			onSuccess: () => {
				setDraft(EMPTY);
			},
		});
	}

	return (
		<>
			<PageHeader
				server={overview.data}
				title={t("autoResponders.title")}
				subtitle={t("autoResponders.subtitle")}
				action={<SavingIndicator state={savingStateOf(saving, add.isSuccess || edit.isSuccess)} />}
			/>

			<Summary>
				{shown.length === 0 ? t("autoResponders.summaryNone") : t("autoResponders.summary", { count: shown.length })}
			</Summary>

			<section aria-labelledby="responders-heading" className="flex flex-col gap-3">
				<SectionHeading
					as="h2"
					id="responders-heading"
					count={t("autoResponders.countOf", { used: all.length, limit: list.data.limit })}
				>
					{t("autoResponders.inUse")}
				</SectionHeading>

				{shown.length === 0 ? (
					<Card>
						<EmptyState
							icon={<MessageSquareReply size={28} />}
							title={t("autoResponders.emptyTitle")}
							body={t("autoResponders.emptyBody")}
						/>
					</Card>
				) : (
					<ul className="flex flex-col gap-3">
						{shown.map((responder) => (
							<ResponderRow
								key={responder.id}
								responder={responder}
								others={all.filter((other) => other.id !== responder.id)}
								saving={saving}
								failure={edit.variables?.id === responder.id ? said(edit.error) : null}
								onSave={(next) => {
									edit.mutate({ id: responder.id, ...cleaned(next) });
								}}
								onRemove={() => {
									undo.schedule({
										key: keyOf(responder),
										label: t("undo.autoResponder", { trigger: responder.trigger }),
										commit: () => remove.mutateAsync({ id: responder.id }),
									});
								}}
							/>
						))}
					</ul>
				)}
			</section>

			<SettingRows
				title={t("autoResponders.add")}
				description={t("autoResponders.addBody", { seconds: AUTO_RESPONDER_LIMITS.answerEverySeconds })}
			>
				<ResponderFields id="new-responder" value={draft} onChange={setDraft} />

				{full && <Warning>{t("autoResponders.full")}</Warning>}
				{blocked !== null && (draft.trigger !== "" || draft.reply !== "") && <Warning>{blocked}</Warning>}
				{add.error !== null && <Warning>{said(add.error)}</Warning>}

				<RowActions>
					<Button disabled={blocked !== null || full || saving} onClick={submit}>
						<Plus size={16} aria-hidden="true" /> {t("autoResponders.addResponder")}
					</Button>
				</RowActions>
			</SettingRows>

			{remove.error !== null && (
				<Warning>
					<Trash2 size={14} aria-hidden="true" className="mr-1 inline" />
					{remove.error instanceof ApiError ? remove.error.message : t("common.couldNotRemove")}
				</Warning>
			)}
		</>
	);
}
