import { LEVEL_LIMITS } from "@testify/shared";
import { CheckList, postableChannels, RoleChecklist, savingStateOf } from "@/components/form";
import { Refusal } from "@/features/levelling/components/Refusal";
import { TabPanel } from "@/features/levelling/components/TabPanel";
import { type TabProps } from "@/features/levelling/levelling.types";
import { useUpdateIgnores } from "@/features/levelling/useLevelling";

export function IgnoresTab({
	guildId,
	channels,
	roles,
	channelIds,
	roleIds,
}: TabProps & { channelIds: string[]; roleIds: string[] }): React.JSX.Element {
	const update = useUpdateIgnores(guildId);

	return (
		<TabPanel
			title="Ignored channels and roles"
			description="Nothing said here, or by anyone holding these roles, earns XP."
			saving={savingStateOf(update.isPending, update.isSuccess)}
			className="gap-6"
		>
			<CheckList
				label="Ignored channels"
				items={postableChannels(channels).map((channel) => ({ id: channel.id, label: `#${channel.name}` }))}
				value={channelIds}
				max={LEVEL_LIMITS.maxIgnoredChannels}
				onChange={(ids) => {
					update.mutate({ channelIds: ids, roleIds });
				}}
			/>

			<RoleChecklist
				label="Ignored roles"
				roles={roles}
				value={roleIds}
				max={LEVEL_LIMITS.maxIgnoredRoles}
				onChange={(next) => {
					update.mutate({ channelIds, roleIds: next });
				}}
			/>

			<Refusal error={update.error} />
		</TabPanel>
	);
}
