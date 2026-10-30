import { type ChannelSummary } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Field } from "@/components/form/Field";
import { SELECT } from "@/components/form/fieldStyles";
import { Warning } from "@/components/form/Warning";
import { channelLabel, seenChannels } from "@/lib/channels";

/** Only channels a message can be sent to, and the ones the bot cannot post in say so rather than disappearing. */
export function postableChannels(channels: ChannelSummary[]): ChannelSummary[] {
	return channels.filter((channel) => channel.kind === "text" || channel.kind === "announcement");
}

export function ChannelPicker({
	channels,
	value,
	onChange,
	label,
	hint,
	allowNone = true,
	noneLabel,
}: {
	channels: ChannelSummary[];
	value: string | null;
	onChange: (channelId: string | null) => void;
	label: string;
	hint?: string;
	allowNone?: boolean;
	noneLabel?: string;
}): React.JSX.Element {
	const { t } = useTranslation();
	const postable = postableChannels(channels);
	const offered = seenChannels(postable);
	const chosen = offered.find((channel) => channel.id === value);
	const hidden = value !== null && chosen === undefined && postable.some((channel) => channel.id === value);
	const gone = value !== null && chosen === undefined && !hidden && channels.length > 0;

	return (
		<Field label={label} {...(hint === undefined ? {} : { hint })}>
			<select
				className={SELECT}
				value={value ?? ""}
				onChange={(event) => {
					onChange(event.target.value === "" ? null : event.target.value);
				}}
			>
				{/* Without an option matching the value, a browser shows the first channel as if it were chosen. */}
				{allowNone ? (
					<option value="">{noneLabel ?? t("common.whereTalking")}</option>
				) : (
					value === null && (
						<option value="" disabled>
							{t("common.chooseChannel")}
						</option>
					)
				)}
				{(gone || hidden) && (
					<option value={value} disabled>
						{hidden ? t("common.hiddenChannelTitle") : t("common.channelGone")}
					</option>
				)}
				{offered.map((channel) => (
					<option key={channel.id} value={channel.id} disabled={!channel.canSend}>
						#{channel.name}
						{channel.canSend ? "" : t("common.cannotPostHere")}
					</option>
				))}
			</select>

			{gone && <Warning>{t("common.channelGoneWarning")}</Warning>}
			{hidden && <Warning>{t("common.hiddenChannelWarning")}</Warning>}
			{chosen?.canSend === false && (
				<Warning>{t("common.cannotPostIn", { channel: channelLabel(channels, chosen.id, t) })}</Warning>
			)}
		</Field>
	);
}
