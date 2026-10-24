import { type ChannelSummary } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Field } from "@/components/form/Field";
import { SELECT } from "@/components/form/fieldStyles";
import { Warning } from "@/components/form/Warning";

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
	const offered = channels.filter((channel) => channel.kind === kind);
	const gone = value !== null && channels.length > 0 && !offered.some((channel) => channel.id === value);

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
				{gone && (
					<option value={value} disabled>
						{t("common.channelGone")}
					</option>
				)}
				{offered.map((channel) => (
					<option key={channel.id} value={channel.id}>
						{channel.name}
					</option>
				))}
			</select>

			{gone && <Warning>{t("common.channelGoneWarning")}</Warning>}
		</Field>
	);
}
