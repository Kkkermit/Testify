import { type ChannelSummary, SCHEDULE_LIMITS, type ScheduleRepeat } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { ChannelPicker, Field, FIELD, SELECT } from "@/components/form";
import { REPEAT_LABELS, REPEAT_ORDER, toLocalInput } from "@/features/scheduled-messages/scheduledMessages.utils";
import { cn } from "@/lib/cn";

/** A schedule as the form holds it: the time is the reader's own wall-clock time until it is sent. */
export interface ScheduleDraft {
	channelId: string | null;
	message: string;
	repeat: ScheduleRepeat;
	localTime: string;
}

/** The four fields of a scheduled message, the same whether it is being added or edited. */
export function ScheduleFields({
	id,
	value,
	channels,
	onChange,
}: {
	id: string;
	value: ScheduleDraft;
	channels: ChannelSummary[];
	onChange: (next: ScheduleDraft) => void;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<>
			<ChannelPicker
				label={t("scheduled.channel")}
				channels={channels}
				value={value.channelId}
				allowNone={false}
				onChange={(channelId) => {
					onChange({ ...value, channelId });
				}}
			/>

			<div className="grid gap-3 sm:grid-cols-2">
				<Field label={t("scheduled.when")} htmlFor={`${id}-when`} hint={t("scheduled.whenHint")}>
					<input
						id={`${id}-when`}
						type="datetime-local"
						value={value.localTime}
						min={toLocalInput(new Date(Date.now() + SCHEDULE_LIMITS.minAheadMinutes * 60_000))}
						onChange={(event) => {
							onChange({ ...value, localTime: event.target.value });
						}}
						className={FIELD}
					/>
				</Field>

				<Field label={t("scheduled.repeat")} htmlFor={`${id}-repeat`}>
					<select
						id={`${id}-repeat`}
						value={value.repeat}
						onChange={(event) => {
							onChange({ ...value, repeat: event.target.value as ScheduleRepeat });
						}}
						className={SELECT}
					>
						{REPEAT_ORDER.map((repeat) => (
							<option key={repeat} value={repeat}>
								{t(REPEAT_LABELS[repeat])}
							</option>
						))}
					</select>
				</Field>
			</div>

			<Field label={t("scheduled.message")} htmlFor={`${id}-message`}>
				<textarea
					id={`${id}-message`}
					rows={3}
					value={value.message}
					maxLength={SCHEDULE_LIMITS.maxMessage}
					onChange={(event) => {
						onChange({ ...value, message: event.target.value });
					}}
					className={cn(FIELD, "resize-y")}
				/>
				<span className="text-muted-foreground text-xs tabular-nums" aria-live="polite">
					{t("common.partOf", { part: value.message.length, whole: SCHEDULE_LIMITS.maxMessage })}
				</span>
			</Field>
		</>
	);
}
