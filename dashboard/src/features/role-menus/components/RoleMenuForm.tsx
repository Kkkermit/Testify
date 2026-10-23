import {
	type ChannelSummary,
	ROLE_MENU_LIMITS,
	roleMenuBlocked,
	type RoleMenuBody,
	type RoleSummary,
} from "@testify/shared";
import { Save } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChannelPicker, Field, FIELD, LABEL, RoleChecklist, Warning } from "@/components/form";
import { Button, Card, CARD_HEADING, SegmentedControl } from "@/components/primitives";
import { bodyOf, type RoleMenuDraft } from "@/features/role-menus/roleMenus.utils";
import { cn } from "@/lib/cn";
import { problemText } from "@/lib/problemText";
import { markupWarning, sanitiseInput } from "@/lib/sanitise";

/** One form for a new menu and for changing one, saved explicitly because a posted menu is a message. */
export function RoleMenuForm({
	initial,
	editing,
	channels,
	roles,
	saving,
	error,
	onSave,
	onCancel,
}: {
	initial: RoleMenuDraft;
	/** The title of the menu being changed, or null for a new one. */
	editing: string | null;
	channels: ChannelSummary[];
	roles: RoleSummary[];
	saving: boolean;
	error: string | null;
	onSave: (body: RoleMenuBody) => void;
	onCancel?: () => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [draft, setDraft] = useState(initial);
	const change = (patch: Partial<RoleMenuDraft>): void => {
		setDraft((current) => ({ ...current, ...patch }));
	};

	const body = bodyOf(draft, sanitiseInput);
	const blocked = problemText(roleMenuBlocked(draft), t);
	const markup = markupWarning(draft.title) ?? markupWarning(draft.description);
	const touched = draft.title !== "" || draft.roleIds.length > 0;

	return (
		<Card className="motion-pop flex flex-col gap-4">
			<div>
				<h2 className={CARD_HEADING}>
					{editing === null ? t("roleMenus.newMenu") : t("roleMenus.editMenu", { title: editing })}
				</h2>
				<p className="text-muted-foreground text-sm">{t("roleMenus.formBody")}</p>
			</div>

			<ChannelPicker
				label={t("roleMenus.channel")}
				hint={t("roleMenus.channelHint")}
				channels={channels}
				value={draft.channelId}
				allowNone={false}
				onChange={(channelId) => {
					change({ channelId });
				}}
			/>

			<Field label={t("roleMenus.menuTitle")} htmlFor="role-menu-title">
				<input
					id="role-menu-title"
					value={draft.title}
					maxLength={ROLE_MENU_LIMITS.maxTitle}
					placeholder={t("roleMenus.titlePlaceholder")}
					onChange={(event) => {
						change({ title: event.target.value });
					}}
					className={FIELD}
				/>
			</Field>

			<Field label={t("roleMenus.description")} htmlFor="role-menu-description" hint={t("roleMenus.descriptionHint")}>
				<textarea
					id="role-menu-description"
					rows={3}
					value={draft.description}
					maxLength={ROLE_MENU_LIMITS.maxDescription}
					onChange={(event) => {
						change({ description: event.target.value });
					}}
					className={cn(FIELD, "resize-y")}
				/>
			</Field>

			<div className="flex flex-col gap-2">
				<span className={LABEL}>{t("roleMenus.mode")}</span>
				<SegmentedControl
					label={t("roleMenus.mode")}
					className="self-start"
					value={draft.mode}
					segments={[
						{ value: "many", label: t("roleMenus.modeMany") },
						{ value: "one", label: t("roleMenus.modeOne") },
					]}
					onChange={(mode) => {
						change({ mode });
					}}
				/>
			</div>

			<RoleChecklist
				label={t("roleMenus.roles")}
				hint={t("roleMenus.rolesHint")}
				roles={roles}
				value={draft.roleIds}
				max={ROLE_MENU_LIMITS.maxRoles}
				requireAssignable
				forbidPowerful
				onChange={(roleIds) => {
					change({ roleIds });
				}}
			/>

			{markup !== null && <Warning>{markup}</Warning>}
			{blocked !== null && touched && <Warning>{blocked}</Warning>}
			{error !== null && <Warning>{error}</Warning>}

			<div className="flex flex-wrap gap-2">
				<Button
					disabled={body === null || markup !== null || saving}
					onClick={() => {
						if (body !== null) onSave(body);
					}}
				>
					<Save size={16} aria-hidden="true" />
					{editing === null ? t("roleMenus.create") : t("common.saveChanges")}
				</Button>
				{onCancel !== undefined && (
					<Button variant="ghost" onClick={onCancel}>
						{t("common.cancel")}
					</Button>
				)}
			</div>
		</Card>
	);
}
