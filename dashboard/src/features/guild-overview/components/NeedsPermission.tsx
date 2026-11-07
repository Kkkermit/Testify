import { type ReaderPermission } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { SettingRows, Warning } from "@/components/form";
import { permissionLabel } from "@/features/commands/permissions.labels";

/** Said beside whatever the reader cannot use, rather than left for the server to refuse; `action` names it. */
export function NeedsPermission({
	permission,
	action,
}: {
	permission: ReaderPermission;
	action?: string;
}): React.JSX.Element {
	const { t } = useTranslation();
	const name = permissionLabel(permission, t);
	return (
		<Warning>
			{action === undefined
				? t("common.youNeedPermission", { permission: name })
				: t("common.actionNeedsPermission", { action, permission: name })}
		</Warning>
	);
}

/** A panel the reader may not use keeps its title, so the page still says what is there and why it is closed. */
export function NeedsPermissionPanel({
	title,
	permission,
}: {
	title: string;
	permission: ReaderPermission;
}): React.JSX.Element {
	return (
		<SettingRows title={title}>
			<NeedsPermission permission={permission} />
		</SettingRows>
	);
}

/** Said where a part needs another screen of the server that the reader's access does not include. */
export function NotGiven({ screen, action }: { screen: string; action?: string }): React.JSX.Element {
	const { t } = useTranslation();
	return (
		<Warning>
			{action === undefined
				? t("common.screenNotGiven", { screen })
				: t("common.actionScreenNotGiven", { action, screen })}
		</Warning>
	);
}

export function NotGivenPanel({ title, screen }: { title: string; screen: string }): React.JSX.Element {
	return (
		<SettingRows title={title}>
			<NotGiven screen={screen} />
		</SettingRows>
	);
}
