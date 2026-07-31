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
	const update = useUpdateLevelling(guildId);

	return (
		<TabPanel title="General" saving={savingStateOf(update.isPending, update.isSuccess)}>
			<Toggle
				label="Members earn XP"
				hint="Turning this off stops XP being awarded. Nobody loses what they already earned."
				checked={config.enabled}
				onChange={(enabled) => {
					update.mutate({ enabled });
				}}
			/>
			<Toggle
				label="Announce level-ups"
				checked={config.announce}
				onChange={(announce) => {
					update.mutate({ announce });
				}}
			/>
			<Toggle
				label="Rewards stack"
				hint="Off means only the highest reward role is kept as members level past each tier."
				checked={config.stackRewards}
				onChange={(stackRewards) => {
					update.mutate({ stackRewards });
				}}
			/>

			<ChannelPicker
				label="Announce level-ups in"
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
