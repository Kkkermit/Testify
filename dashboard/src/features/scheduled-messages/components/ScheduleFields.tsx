import { type ChannelSummary, SCHEDULE_LIMITS, type ScheduleRepeat } from "@testify/shared";
import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChannelPicker, Field, FIELD, SELECT } from "@/components/form";
import { useRowLayout } from "@/components/form/rowLayout";
import { REPEAT_LABELS, REPEAT_ORDER, toLocalInput } from "@/features/scheduled-messages/scheduledMessages.utils";
import { SendTest } from "@/features/test-post/SendTest";
import { PostPreview } from "@/features/welcome/components/PostPreview";
import { cn } from "@/lib/cn";

export interface ScheduleDraft {
	channelId: string | null;
	message: string;
	repeat: ScheduleRepeat;
	localTime: string;
}

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
	const row = useRowLayout();

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

			<Pair row={row}>
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
			</Pair>

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
				{row && (
					<>
						<PostPreview text={value.message} empty={t("common.previewEmpty")} />
						<SendTest test={{ kind: "plain", message: value.message }} />
					</>
				)}
			</Field>
		</>
	);
}

function Pair({ row, children }: { row: boolean; children: ReactNode }): React.JSX.Element {
	return row ? <>{children}</> : <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}
