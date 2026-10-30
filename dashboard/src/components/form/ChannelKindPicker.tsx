import { type ChannelSummary } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Field } from "@/components/form/Field";
import { SELECT } from "@/components/form/fieldStyles";
import { Warning } from "@/components/form/Warning";
import { seenChannels } from "@/lib/channels";

/** A voice channel or a category, which nothing is posted in, so whether the bot can post there is no concern of it. */
export function ChannelKindPicker({
	kind,
	channels,
	value,
	onChange,
	label,
	hint,
	noneLabel,
}: {
	kind: "voice" | "category";
	channels: ChannelSummary[];
	value: string | null;
	onChange: (channelId: string | null) => void;
	label: string;
	hint?: string;
	noneLabel: string;
}): React.JSX.Element {
	const { t } = useTranslation();
	const ofKind = channels.filter((channel) => channel.kind === kind);
	const offered = seenChannels(ofKind);
	const listed = value === null || offered.some((channel) => channel.id === value);
	const hidden = !listed && ofKind.some((channel) => channel.id === value);
	const gone = !listed && !hidden && channels.length > 0;

	return (
		<Field label={label} {...(hint === undefined ? {} : { hint })}>
			<select
				className={SELECT}
				value={value ?? ""}
				onChange={(event) => {
					onChange(event.target.value === "" ? null : event.target.value);
				}}
			>
				<option value="">{noneLabel}</option>
				{(gone || hidden) && (
					<option value={value} disabled>
						{hidden ? t("common.hiddenChannelTitle") : t("common.channelGone")}
					</option>
				)}
				{offered.map((channel) => (
					<option key={channel.id} value={channel.id}>
						{channel.name}
					</option>
				))}
			</select>

			{gone && <Warning>{t("common.channelGoneWarning")}</Warning>}
			{hidden && <Warning>{t("common.hiddenChannelWarning")}</Warning>}
		</Field>
	);
}
