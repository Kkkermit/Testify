import { type ChannelSummary, type VoiceStatsPatch, type VoiceStatsSetting } from "@testify/shared";
import { AudioLines } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ChannelKindPicker, savingStateOf } from "@/components/form";
import { Section } from "@/features/settings/components/Section";
import { useSaveSection } from "@/features/settings/useSettings";

/** The count is the voice channel's own name, so these are voice channels rather than ones a message is posted in. */
export function VoiceStatsSection({
	guildId,
	value,
	channels,
}: {
	guildId: string;
	value: VoiceStatsSetting;
	channels: ChannelSummary[];
}): React.JSX.Element {
	const { t } = useTranslation();
	const save = useSaveSection<VoiceStatsPatch>(guildId, "voice-stats");

	return (
		<Section
			icon={AudioLines}
			tint="text-feature-tickets"
			title={t("settings.voiceTitle")}
			describes={t("settings.voiceBody")}
			saving={savingStateOf(save.isPending, save.isSuccess)}
			failure={save.error}
		>
			<ChannelKindPicker
				kind="voice"
				noneLabel={t("settings.voiceNotShown")}
				label={t("settings.voiceMembers")}
				channels={channels}
				value={value.memberChannelId}
				onChange={(memberChannelId) => {
					save.mutate({ memberChannelId });
				}}
			/>
			<ChannelKindPicker
				kind="voice"
				noneLabel={t("settings.voiceNotShown")}
				label={t("settings.voiceBots")}
				channels={channels}
				value={value.botChannelId}
				onChange={(botChannelId) => {
					save.mutate({ botChannelId });
				}}
			/>
		</Section>
	);
}
