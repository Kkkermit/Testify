import { MEMBER_ACTION_LIMITS, type MemberRoles } from "@testify/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckList, Refusal, RowActions, SettingRows, Warning } from "@/components/form";
import { RoleSwatch } from "@/components/form/RoleSwatch";
import { Button, Skeleton } from "@/components/primitives";
import { NeedsPermission } from "@/features/guild-overview/components/NeedsPermission";
import { useHolds, useLacks } from "@/features/guild-overview/useLacks";
import { useMemberRoles, useSetMemberRoles } from "@/features/members/useMemberDetail";
import { ApiError } from "@/lib/api";

export function RolesCard({ guildId, userId }: { guildId: string; userId: string }): React.JSX.Element {
	const { t } = useTranslation();
	const blocked = useLacks(guildId)("ManageRoles");
	const roles = useMemberRoles(guildId, userId, useHolds(guildId)("ManageRoles"));
	const refused = roles.error instanceof ApiError && roles.error.code === "missing_permission";

	return (
		<SettingRows title={t("members.rolesTitle")} description={t("members.rolesBody")}>
			{blocked || refused ? (
				<NeedsPermission permission="ManageRoles" />
			) : roles.isError ? (
				<Warning>{t("members.rolesUnreadable")}</Warning>
			) : roles.data === undefined ? (
				<Skeleton className="h-32 w-full" />
			) : (
				<RolesForm key={heldKey(roles.data)} guildId={guildId} userId={userId} roles={roles.data} />
			)}
		</SettingRows>
	);
}

function heldKey(roles: MemberRoles): string {
	return roles.roles
		.filter((role) => role.held)
		.map((role) => role.id)
		.join(",");
}

function RolesForm({
	guildId,
	userId,
	roles,
}: {
	guildId: string;
	userId: string;
	roles: MemberRoles;
}): React.JSX.Element {
	const { t } = useTranslation();
	const save = useSetMemberRoles(guildId, userId);
	const held = roles.roles.filter((role) => role.held).map((role) => role.id);
	const [draft, setDraft] = useState(held);
	const changed = draft.length !== held.length || draft.some((roleId) => !held.includes(roleId));

	if (roles.roles.length === 0) return <p className="text-muted-foreground text-sm">{t("members.rolesNone")}</p>;

	return (
		<>
			<CheckList
				label={t("members.rolesLabel")}
				items={roles.roles.map((role) => ({
					id: role.id,
					label: <RoleSwatch name={role.name} colour={role.colour} />,
				}))}
				value={draft}
				max={MEMBER_ACTION_LIMITS.maxRoles}
				onChange={setDraft}
			/>
			<RowActions>
				<Button
					variant="secondary"
					disabled={!changed || save.isPending}
					onClick={() => {
						save.mutate(draft);
					}}
				>
					{t("members.saveRoles")}
				</Button>
				{changed && (
					<Button
						variant="ghost"
						onClick={() => {
							setDraft(held);
						}}
					>
						{t("common.discard")}
					</Button>
				)}
			</RowActions>
			<Refusal error={save.error} />
		</>
	);
}
