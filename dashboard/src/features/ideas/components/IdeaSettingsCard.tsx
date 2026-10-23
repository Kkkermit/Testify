import { type ChannelSummary, type IdeaSettings } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { ChannelPicker, Toggle, Warning } from "@/components/form";
import { Card, CARD_HEADING } from "@/components/primitives";

/** The switch and the channel, each saved the moment it changes. */
export function IdeaSettingsCard({
	settings,
	channels,
	saving,
	error,
	onChange,
}: {
	settings: IdeaSettings;
	channels: ChannelSummary[];
	saving: boolean;
	error: string | null;
	onChange: (patch: { enabled?: boolean; channelId?: string | null }) => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const channel = channels.find((entry) => entry.id === settings.channelId)?.name ?? "";

	return (
		<Card className="flex flex-col gap-4">
			<div>
				<h2 className={CARD_HEADING}>{t("ideas.board")}</h2>
				<p className="text-muted-foreground text-sm">{t("ideas.boardBody")}</p>
			</div>

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

			{settings.channelId !== null && !settings.canSend && <Warning>{t("common.cannotPostIn", { channel })}</Warning>}
			{error !== null && <Warning>{error}</Warning>}
		</Card>
	);
}
