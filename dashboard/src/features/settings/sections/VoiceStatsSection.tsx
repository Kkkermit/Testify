import { type ChannelSummary, type VoiceStatsPatch, type VoiceStatsSetting } from "@testify/shared";
import { AudioLines } from "lucide-react";
import { Field, FIELD, savingStateOf, SELECT } from "@/components/form";
import { Section } from "@/features/settings/components/Section";
import { useSaveSection } from "@/features/settings/useSettings";
import { cn } from "@/lib/cn";

/** Voice channels, not text ones — the count is the channel's own name, so `ChannelPicker` is the wrong control. */
export function VoiceStatsSection({
	guildId,
	value,
	channels,
}: {
	guildId: string;
	value: VoiceStatsSetting;
	channels: ChannelSummary[];
}): React.JSX.Element {
	const save = useSaveSection<VoiceStatsPatch>(guildId, "voice-stats");
	const voice = channels.filter((channel) => channel.kind === "voice");

	return (
		<Section
			icon={AudioLines}
			tint="text-feature-tickets"
			title="Member count channels"
			describes="Voice channels renamed to show how many members and bots the server has."
			saving={savingStateOf(save.isPending, save.isSuccess)}
		>
			<VoicePicker
				label="Members"
				channels={voice}
				value={value.memberChannelId}
				onChange={(memberChannelId) => {
					save.mutate({ memberChannelId });
				}}
			/>
			<VoicePicker
				label="Bots"
				channels={voice}
				value={value.botChannelId}
				onChange={(botChannelId) => {
					save.mutate({ botChannelId });
				}}
			/>
		</Section>
	);
}

function VoicePicker({
	label,
	channels,
	value,
	onChange,
}: {
	label: string;
	channels: ChannelSummary[];
	value: string | null;
	onChange: (channelId: string | null) => void;
}): React.JSX.Element {
	return (
		<Field label={label}>
			<select
				className={cn(FIELD, SELECT)}
				value={value ?? ""}
				onChange={(event) => {
					onChange(event.target.value === "" ? null : event.target.value);
				}}
			>
				<option value="">Not shown</option>
				{channels.map((channel) => (
					<option key={channel.id} value={channel.id}>
						{channel.name}
					</option>
				))}
			</select>
		</Field>
	);
}
