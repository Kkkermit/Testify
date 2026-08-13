import { SETTINGS_LIMITS, type AutoRolePut, type AutoRoleSetting, type RoleSummary } from "@testify/shared";
import { UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RoleChecklist, savingStateOf, Warning } from "@/components/form";
import { Section } from "@/features/settings/components/Section";
import { useSaveSection } from "@/features/settings/useSettings";

export function AutoRoleSection({
	guildId,
	value,
	roles,
}: {
	guildId: string;
	value: AutoRoleSetting;
	roles: RoleSummary[];
}): React.JSX.Element {
	const { t } = useTranslation();
	const save = useSaveSection<AutoRolePut>(guildId, "auto-roles", "put");
	// The same check `applyLevelRewards` makes at runtime, surfaced before anybody saves a list that cannot work.
	const unassignable = roles.filter((role) => value.roleIds.includes(role.id) && !role.assignableByBot);

	return (
		<Section
			icon={UserPlus}
			tint="text-feature-welcome"
			title={t("settings.autoRoleTitle")}
			describes={t("settings.autoRoleBody")}
			saving={savingStateOf(save.isPending, save.isSuccess)}
			failure={save.error}
		>
			<RoleChecklist
				label={t("settings.autoRoleGive")}
				roles={roles}
				value={value.roleIds}
				max={SETTINGS_LIMITS.maxAutoRoles}
				onChange={(roleIds) => {
					save.mutate({ roleIds });
				}}
			/>

			{unassignable.length > 0 && (
				<Warning>
					Testify cannot give {unassignable.map((role) => role.name).join(", ")} — move its own role above them in the
					server settings.
				</Warning>
			)}
		</Section>
	);
}
