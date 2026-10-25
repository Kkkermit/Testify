import {
	type ChannelSummary,
	scheduleContentBlocked,
	type ScheduledMessage,
	type ScheduledMessageInput,
	scheduleTimeBlocked,
} from "@testify/shared";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Warning } from "@/components/form";
import { Button, cardClass } from "@/components/primitives";
import { ScheduleFields, type ScheduleDraft } from "@/features/scheduled-messages/components/ScheduleFields";
import { fromLocalInput, REPEAT_LABELS, toLocalInput } from "@/features/scheduled-messages/scheduledMessages.utils";
import { dateAndTime } from "@/lib/datetime";
import { problemText } from "@/lib/problemText";
import { markupWarning } from "@/lib/sanitise";

function draftOf(entry: ScheduledMessage): ScheduleDraft {
	return {
		channelId: entry.channelId,
		message: entry.message,
		repeat: entry.repeat,
		localTime: toLocalInput(entry.nextAt),
	};
}

/** One scheduled message, edited in place and saved explicitly, because it is a message somebody will read. */
export function ScheduleRow({
	entry,
	channels,
	saving,
	failure,
	onSave,
	onRemove,
}: {
	entry: ScheduledMessage;
	channels: ChannelSummary[];
	saving: boolean;
	/** Why the last save of this row was refused, shown beside it rather than at the foot of the page. */
	failure: string | null;
	onSave: (next: ScheduledMessageInput) => void;
	onRemove: () => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [draft, setDraft] = useState<ScheduleDraft>(() => draftOf(entry));

	useEffect(() => {
		setDraft(draftOf(entry));
	}, [entry.channelId, entry.message, entry.repeat, entry.nextAt]);

	const saved = draftOf(entry);
	const timeChanged = draft.localTime !== saved.localTime;
	const dirty =
		timeChanged ||
		draft.channelId !== saved.channelId ||
		draft.message !== saved.message ||
		draft.repeat !== saved.repeat;
	// An unchanged time is sent back as it was stored, so a post already due can still have its words corrected.
	const nextAt = timeChanged ? fromLocalInput(draft.localTime) : new Date(entry.nextAt);
	const blocked =
		problemText(scheduleContentBlocked(draft), t) ??
		(timeChanged ? problemText(scheduleTimeBlocked(nextAt, new Date()), t) : null) ??
		markupWarning(draft.message);
	const found = channels.find((channel) => channel.id === entry.channelId)?.name;
	const channel = found === undefined ? t("sticky.deletedChannel") : `#${found}`;

	return (
		<li className={cardClass("compact", "flex flex-col gap-3")}>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h3 className="text-sm font-medium">{t("scheduled.rowTitle", { channel, when: dateAndTime(entry.nextAt) })}</h3>
				<span className="text-muted-foreground text-xs">{t(REPEAT_LABELS[entry.repeat])}</span>
			</div>

			<ScheduleFields id={`schedule-${entry.id}`} value={draft} channels={channels} onChange={setDraft} />

			<div className="flex flex-wrap items-center gap-3">
				{dirty && (
					<Button
						disabled={saving || blocked !== null || draft.channelId === null || nextAt === null}
						onClick={() => {
							if (draft.channelId === null || nextAt === null) return;
							onSave({
								channelId: draft.channelId,
								message: draft.message,
								repeat: draft.repeat,
								nextAt: timeChanged ? nextAt.toISOString() : entry.nextAt,
							});
						}}
					>
						{t("common.save")}
					</Button>
				)}
				<Button variant="ghost" aria-label={t("scheduled.removeIn", { channel })} onClick={onRemove} disabled={saving}>
					<Trash2 size={16} aria-hidden="true" />
				</Button>
			</div>

			{dirty && blocked !== null && <Warning>{blocked}</Warning>}
			{!entry.canSend && <Warning>{t("scheduled.cannotPost", { channel })}</Warning>}
			{failure !== null && <Warning>{failure}</Warning>}
		</li>
	);
}
