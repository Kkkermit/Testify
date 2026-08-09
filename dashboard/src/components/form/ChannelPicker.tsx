import { type ChannelSummary } from "@testify/shared";
import { Field } from "@/components/form/Field";
import { SELECT } from "@/components/form/fieldStyles";
import { Warning } from "@/components/form/Warning";

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
	noneLabel = "Where they were talking",
}: {
	channels: ChannelSummary[];
	value: string | null;
	onChange: (channelId: string | null) => void;
	label: string;
	hint?: string;
	allowNone?: boolean;
	noneLabel?: string;
}): React.JSX.Element {
	const postable = postableChannels(channels);
	const chosen = postable.find((channel) => channel.id === value);

	return (
		<Field label={label} {...(hint === undefined ? {} : { hint })}>
			<select
				className={SELECT}
				value={value ?? ""}
				onChange={(event) => {
					onChange(event.target.value === "" ? null : event.target.value);
				}}
			>
				{allowNone && <option value="">{noneLabel}</option>}
				{postable.map((channel) => (
					<option key={channel.id} value={channel.id} disabled={!channel.canSend}>
						#{channel.name}
						{channel.canSend ? "" : " — Testify cannot post here"}
					</option>
				))}
			</select>

			{chosen?.canSend === false && (
				<Warning>Testify cannot post in #{chosen.name}. Level-ups will not appear until that is fixed.</Warning>
			)}
		</Field>
	);
}
