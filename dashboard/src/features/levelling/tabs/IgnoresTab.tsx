import { LEVEL_LIMITS } from "@testify/shared";
import { useTranslation } from "react-i18next";
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
	const { t } = useTranslation();
	const update = useUpdateIgnores(guildId);

	return (
		<TabPanel
			description="Nothing said here, or by anyone holding these roles, earns XP."
			saving={savingStateOf(update.isPending, update.isSuccess)}
			className="gap-6"
		>
			<CheckList
				label={t("levelling.ignoredChannels")}
				items={postableChannels(channels).map((channel) => ({ id: channel.id, label: `#${channel.name}` }))}
				value={channelIds}
				max={LEVEL_LIMITS.maxIgnoredChannels}
				onChange={(ids) => {
					update.mutate({ channelIds: ids, roleIds });
				}}
			/>

			<RoleChecklist
				label={t("levelling.ignoredRoles")}
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
