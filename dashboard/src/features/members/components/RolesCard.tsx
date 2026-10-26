import { MEMBER_ACTION_LIMITS, type MemberRoles } from "@testify/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckList, Warning } from "@/components/form";
import { RoleSwatch } from "@/components/form/RoleSwatch";
import { Button, Card, CARD_HEADING, Skeleton } from "@/components/primitives";
import { useMemberRoles, useSetMemberRoles } from "@/features/members/useMemberDetail";
import { ApiError } from "@/lib/api";

/** The roles the reader could hand out themselves, held as a draft until Save so a list goes in one request. */
export function RolesCard({ guildId, userId }: { guildId: string; userId: string }): React.JSX.Element {
	const { t } = useTranslation();
	const roles = useMemberRoles(guildId, userId, true);

	return (
		<Card className="flex flex-col gap-4">
			<div>
				<h2 className={CARD_HEADING}>{t("members.rolesTitle")}</h2>
				<p className="text-muted-foreground text-sm">{t("members.rolesBody")}</p>
			</div>

			{roles.isError ? (
				<Warning>
					{roles.error instanceof ApiError && roles.error.code === "missing_permission"
						? t("members.rolesNeedPermission")
						: t("members.rolesUnreadable")}
				</Warning>
			) : roles.data === undefined ? (
				<Skeleton className="h-32 w-full" />
			) : (
				<RolesForm key={heldKey(roles.data)} guildId={guildId} userId={userId} roles={roles.data} />
			)}
		</Card>
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
			<div className="flex flex-wrap gap-3">
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
			</div>
			{save.error !== null && (
				<Warning>{save.error instanceof ApiError ? save.error.message : t("common.couldNotSave")}</Warning>
			)}
		</>
	);
}
