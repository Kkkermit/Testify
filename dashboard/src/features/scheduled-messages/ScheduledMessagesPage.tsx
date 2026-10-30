import { SCHEDULE_LIMITS, scheduleBlocked, type ScheduledMessage } from "@testify/shared";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { useUndo } from "@/app/undo";
import { SavingIndicator, savingStateOf, Warning } from "@/components/form";
import {
	Button,
	Card,
	CARD_HEADING,
	cardClass,
	EmptyState,
	Eyebrow,
	PageHeader,
	Skeleton,
} from "@/components/primitives";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels } from "@/features/levelling/useLevelling";
import { ScheduleFields, type ScheduleDraft } from "@/features/scheduled-messages/components/ScheduleFields";
import { ScheduleRow } from "@/features/scheduled-messages/components/ScheduleRow";
import { fromLocalInput } from "@/features/scheduled-messages/scheduledMessages.utils";
import {
	useAddScheduledMessage,
	useEditScheduledMessage,
	useRemoveScheduledMessage,
	useScheduledMessages,
} from "@/features/scheduled-messages/useScheduledMessages";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { channelLabel } from "@/lib/channels";
import { problemText } from "@/lib/problemText";
import { markupWarning, sanitiseInput } from "@/lib/sanitise";

const EMPTY: ScheduleDraft = { channelId: null, message: "", repeat: "once", localTime: "" };

/** Messages the bot posts later, soonest first, each edited where it is listed. */
export function ScheduledMessagesPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();

	const list = useScheduledMessages(guildId);
	const channels = useChannels(guildId);
	const overview = useGuildOverview(guildId);
	const add = useAddScheduledMessage(guildId);
	const edit = useEditScheduledMessage(guildId);
	const remove = useRemoveScheduledMessage(guildId);
	const undo = useUndo();

	usePageTitle(t("scheduled.title"), overview.data?.name);

	const [draft, setDraft] = useState<ScheduleDraft>(EMPTY);

	if (list.isPending) return <Skeleton className="h-96 w-full" />;
	if (list.isError) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />;

	// One waiting to be deleted still holds its place against the limit, so nothing can be added into the gap.
	const all = list.data.messages;
	const keyOf = (entry: ScheduledMessage): string => `scheduled:${guildId}:${entry.id}`;
	const shown = all.filter((entry) => !undo.isHidden(keyOf(entry)));
	const full = all.length >= list.data.limit;
	const nextAt = fromLocalInput(draft.localTime);
	const blocked = problemText(scheduleBlocked({ ...draft, nextAt }, new Date()), t) ?? markupWarning(draft.message);
	const touched = draft.channelId !== null || draft.message !== "" || draft.localTime !== "";
	const saving = add.isPending || edit.isPending || remove.isPending;
	const said = (error: Error | null): string | null =>
		error === null ? null : error instanceof ApiError ? error.message : t("common.couldNotSave");
	const channelName = (id: string): string => channelLabel(channels.data ?? [], id, t);

	function submit(): void {
		if (blocked !== null || full || draft.channelId === null || nextAt === null) return;
		add.mutate(
			{
				channelId: draft.channelId,
				message: sanitiseInput(draft.message),
				repeat: draft.repeat,
				nextAt: nextAt.toISOString(),
			},
			{
				onSuccess: () => {
					setDraft(EMPTY);
				},
			},
		);
	}

	return (
		<>
			<PageHeader
				eyebrow={overview.data?.name}
				title={t("scheduled.title")}
				subtitle={t("scheduled.subtitle")}
				action={<SavingIndicator state={savingStateOf(saving, add.isSuccess || edit.isSuccess)} />}
			/>

			<section aria-labelledby="scheduled-heading" className="flex flex-col gap-3">
				<Eyebrow
					as="h2"
					id="scheduled-heading"
					count={t("scheduled.countOf", { used: all.length, limit: list.data.limit })}
				>
					{t("scheduled.upcoming")}
				</Eyebrow>

				{shown.length === 0 ? (
					<Card>
						<EmptyState
							icon={<CalendarClock size={28} />}
							title={t("scheduled.emptyTitle")}
							body={t("scheduled.emptyBody")}
						/>
					</Card>
				) : (
					<ul className="flex flex-col gap-3">
						{shown.map((entry) => (
							<ScheduleRow
								key={entry.id}
								entry={entry}
								channels={channels.data ?? []}
								saving={saving}
								failure={edit.variables?.id === entry.id ? said(edit.error) : null}
								onSave={(next) => {
									edit.mutate({ id: entry.id, ...next, message: sanitiseInput(next.message) });
								}}
								onRemove={() => {
									undo.schedule({
										key: keyOf(entry),
										label: t("undo.scheduled", { channel: channelName(entry.channelId) }),
										commit: () => remove.mutateAsync({ id: entry.id }),
									});
								}}
							/>
						))}
					</ul>
				)}
			</section>

			<section aria-labelledby="add-heading" className={cardClass("default", "motion-pop flex flex-col gap-4")}>
				<div>
					<h2 id="add-heading" className={CARD_HEADING}>
						{t("scheduled.add")}
					</h2>
					<p className="text-muted-foreground text-sm">
						{t("scheduled.addBody", { minutes: SCHEDULE_LIMITS.lateByMinutes })}
					</p>
				</div>

				<ScheduleFields id="new-schedule" value={draft} channels={channels.data ?? []} onChange={setDraft} />

				{full && <Warning>{t("scheduled.full")}</Warning>}
				{blocked !== null && touched && <Warning>{blocked}</Warning>}
				{add.error !== null && <Warning>{said(add.error)}</Warning>}

				<div>
					<Button disabled={blocked !== null || full || saving} onClick={submit}>
						<Plus size={16} aria-hidden="true" /> {t("scheduled.schedule")}
					</Button>
				</div>
			</section>

			{remove.error !== null && (
				<Warning>
					<Trash2 size={14} aria-hidden="true" className="mr-1 inline" />
					{remove.error instanceof ApiError ? remove.error.message : t("common.couldNotRemove")}
				</Warning>
			)}
		</>
	);
}
