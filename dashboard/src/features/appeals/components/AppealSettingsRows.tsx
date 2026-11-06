import { APPEAL_LIMITS, type AppealSettings, type AppealSettingsPatch, type ChannelSummary } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { ChannelPicker, Field, SELECT, SettingRows, Toggle } from "@/components/form";

export function AppealSettingsRows({
	settings,
	channels,
	saving,
	onChange,
}: {
	settings: AppealSettings;
	channels: ChannelSummary[];
	saving: boolean;
	onChange: (patch: AppealSettingsPatch) => void;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<SettingRows>
			<Toggle
				label={t("appeals.enabled")}
				hint={settings.channelId === null ? t("appeals.enabledHintNoChannel") : t("appeals.enabledHint")}
				checked={settings.enabled}
				disabled={saving || (!settings.enabled && settings.channelId === null)}
				onChange={(enabled) => {
					onChange({ enabled });
				}}
			/>

			<ChannelPicker
				label={t("appeals.channel")}
				hint={t("appeals.channelHint")}
				channels={channels}
				value={settings.channelId}
				allowNone={false}
				onChange={(channelId) => {
					onChange({ channelId });
				}}
			/>

			<Field label={t("appeals.cooldown")} htmlFor="appeal-cooldown" hint={t("appeals.cooldownHint")}>
				<select
					id="appeal-cooldown"
					className={SELECT}
					value={String(settings.cooldownDays)}
					disabled={saving}
					onChange={(event) => {
						const days = APPEAL_LIMITS.cooldownChoices.find((choice) => String(choice) === event.target.value);
						if (days !== undefined) onChange({ cooldownDays: days });
					}}
				>
					{APPEAL_LIMITS.cooldownChoices.map((days) => (
						<option key={days} value={days}>
							{t("appeals.cooldownDays", { count: days })}
						</option>
					))}
				</select>
			</Field>
		</SettingRows>
	);
}
