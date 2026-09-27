import { useTranslation } from "react-i18next";
import { ChannelPicker, savingStateOf, Toggle } from "@/components/form";
import { Refusal } from "@/features/levelling/components/Refusal";
import { TabPanel } from "@/features/levelling/components/TabPanel";
import { type GeneralSettings, type TabProps } from "@/features/levelling/levelling.types";
import { useUpdateLevelling } from "@/features/levelling/useLevelling";

export function GeneralTab({
	guildId,
	channels,
	config,
}: Pick<TabProps, "guildId" | "channels"> & { config: GeneralSettings }): React.JSX.Element {
	const { t } = useTranslation();
	const update = useUpdateLevelling(guildId);

	return (
		<TabPanel saving={savingStateOf(update.isPending, update.isSuccess)}>
			<Toggle
				label={t("levelling.earnXp")}
				hint={t("levelling.earnXpHint")}
				checked={config.enabled}
				onChange={(enabled) => {
					update.mutate({ enabled });
				}}
			/>
			<Toggle
				label={t("levelling.announce")}
				checked={config.announce}
				onChange={(announce) => {
					update.mutate({ announce });
				}}
			/>
			<Toggle
				label={t("levelling.stack")}
				hint={t("levelling.stackHint")}
				checked={config.stackRewards}
				onChange={(stackRewards) => {
					update.mutate({ stackRewards });
				}}
			/>

			<ChannelPicker
				label={t("levelling.announceIn")}
				channels={channels}
				value={config.levelUpChannelId}
				onChange={(levelUpChannelId) => {
					update.mutate({ levelUpChannelId });
				}}
			/>

			<Refusal error={update.error} />
		</TabPanel>
	);
}
