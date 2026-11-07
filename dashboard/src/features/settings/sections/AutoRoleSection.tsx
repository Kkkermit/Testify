import { SETTINGS_LIMITS, type AutoRolePut, type AutoRoleSetting, type RoleSummary } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { RoleChecklist, savingStateOf, Warning } from "@/components/form";
import { NeedsPermission } from "@/features/guild-overview/components/NeedsPermission";
import { useLacks } from "@/features/guild-overview/useLacks";
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
	const blocked = useLacks(guildId)("ManageRoles");
	const unassignable = roles.filter((role) => value.roleIds.includes(role.id) && !role.assignableByBot);

	return (
		<Section
			title={t("settings.autoRoleTitle")}
			describes={t("settings.autoRoleBody")}
			saving={savingStateOf(save.isPending, save.isSuccess)}
			failure={save.error}
		>
			{blocked ? (
				<NeedsPermission permission="ManageRoles" />
			) : (
				<RoleChecklist
					label={t("settings.autoRoleGive")}
					roles={roles}
					value={value.roleIds}
					max={SETTINGS_LIMITS.maxAutoRoles}
					onChange={(roleIds) => {
						save.mutate({ roleIds });
					}}
				/>
			)}

			{unassignable.length > 0 && (
				<Warning>
					{t("settings.cannotGiveRoles", {
						roles: unassignable.map((role) => role.name).join(t("common.listSeparator")),
					})}
				</Warning>
			)}
		</Section>
	);
}
