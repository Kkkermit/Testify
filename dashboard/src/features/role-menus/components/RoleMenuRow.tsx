import { type ChannelSummary, type RoleMenuEntry, type RoleSummary } from "@testify/shared";
import { Pencil, Send, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Warning } from "@/components/form";
import { RoleSwatch } from "@/components/form/RoleSwatch";
import { Badge, Button, CARD_HEADING, cardClass } from "@/components/primitives";

/** One menu, with what it offers and the actions beside it. */
export function RoleMenuRow({
	menu,
	channels,
	roles,
	busy,
	onEdit,
	onPublish,
	onRemove,
}: {
	menu: RoleMenuEntry;
	channels: ChannelSummary[];
	roles: RoleSummary[];
	busy: boolean;
	onEdit: () => void;
	onPublish: () => void;
	onRemove: () => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const channel = channels.find((entry) => entry.id === menu.channelId)?.name ?? t("common.channelGone");
	const offered = menu.roleIds.map((roleId) => roles.find((role) => role.id === roleId));

	return (
		<li className={cardClass("compact", "flex flex-col gap-3")}>
			<div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
				<div className="min-w-0">
					<h3 className={CARD_HEADING}>{menu.title}</h3>
					<p className="text-muted-foreground text-xs">
						#{channel} · {t(menu.mode === "one" ? "roleMenus.holdOne" : "roleMenus.holdMany")}
					</p>
				</div>
				{menu.posted ? (
					<Badge tone="success">{t("roleMenus.posted")}</Badge>
				) : (
					<Badge>{t("roleMenus.notPosted")}</Badge>
				)}
			</div>

			<ul aria-label={t("roleMenus.rolesIn", { title: menu.title })} className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
				{offered.map((role, index) => (
					<li key={menu.roleIds[index]}>
						{role === undefined ? (
							<span className="text-muted-foreground">{t("roleMenus.deletedRole")}</span>
						) : (
							<RoleSwatch name={role.name} colour={role.colour} />
						)}
					</li>
				))}
			</ul>

			{!menu.canSend && <Warning>{t("common.cannotPostIn", { channel })}</Warning>}

			<div className="flex flex-wrap gap-2">
				<Button variant="secondary" disabled={busy} onClick={onEdit}>
					<Pencil size={15} aria-hidden="true" />
					{t("roleMenus.edit")}
				</Button>
				<Button variant="secondary" disabled={busy || !menu.canSend} onClick={onPublish}>
					<Send size={15} aria-hidden="true" />
					{t(menu.posted ? "roleMenus.updatePost" : "roleMenus.post")}
				</Button>
				<Button variant="ghost" disabled={busy} onClick={onRemove}>
					<Trash2 size={16} aria-hidden="true" />
					<span className="sr-only">{t("roleMenus.deleteMenu", { title: menu.title })}</span>
				</Button>
			</div>
		</li>
	);
}
