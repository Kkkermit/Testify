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
import { LeaveGuard } from "@/app/LeaveGuard";
import {
	ChannelPicker,
	Field,
	FIELD,
	FieldGroup,
	RoleChecklist,
	RowActions,
	SettingRows,
	Warning,
} from "@/components/form";
import { Button, SegmentedControl } from "@/components/primitives";
import { bodyOf, draftChanged, type RoleMenuDraft } from "@/features/role-menus/roleMenus.utils";
import { cn } from "@/lib/cn";
import { problemText } from "@/lib/problemText";
import { markupWarning, sanitiseInput } from "@/lib/sanitise";

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
	const dirty = draftChanged(initial, draft);

	return (
		<>
			<LeaveGuard when={dirty && !saving} />
			<SettingRows
				title={editing === null ? t("roleMenus.newMenu") : t("roleMenus.editMenu", { title: editing })}
				description={t("roleMenus.formBody")}
			>
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

				<FieldGroup label={t("roleMenus.mode")} named={false}>
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
				</FieldGroup>

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

				<RowActions>
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
				</RowActions>
			</SettingRows>
		</>
	);
}
