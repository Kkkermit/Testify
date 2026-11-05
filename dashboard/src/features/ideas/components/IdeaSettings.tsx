import { type ChannelSummary, type IdeaSettings as Settings } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { ChannelPicker, SettingRows, Toggle } from "@/components/form";

export function IdeaSettings({
	settings,
	channels,
	saving,
	onChange,
}: {
	settings: Settings;
	channels: ChannelSummary[];
	saving: boolean;
	onChange: (patch: { enabled?: boolean; channelId?: string | null }) => void;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<SettingRows>
			<Toggle
				label={t("ideas.enabled")}
				hint={settings.channelId === null ? t("ideas.enabledHintNoChannel") : t("ideas.enabledHint")}
				checked={settings.enabled}
				disabled={saving || (!settings.enabled && settings.channelId === null)}
				onChange={(enabled) => {
					onChange({ enabled });
				}}
			/>

			<ChannelPicker
				label={t("ideas.channel")}
				hint={t("ideas.channelHint")}
				channels={channels}
				value={settings.channelId}
				allowNone={false}
				onChange={(channelId) => {
					onChange({ channelId });
				}}
			/>
		</SettingRows>
	);
}
