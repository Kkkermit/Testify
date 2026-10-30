import { type TFunction } from "i18next";
import { type TranslationKey } from "@/i18n";

/** Discord's permission flags by the names its own client gives them, keyed by the flag the API sends. */
const PERMISSION_LABELS: Record<string, TranslationKey> = {
	Administrator: "commands.permissionAdministrator",
	AttachFiles: "commands.permissionAttachFiles",
	BanMembers: "commands.permissionBanMembers",
	ChangeNickname: "commands.permissionChangeNickname",
	Connect: "commands.permissionConnect",
	EmbedLinks: "commands.permissionEmbedLinks",
	KickMembers: "commands.permissionKickMembers",
	ManageChannels: "commands.permissionManageChannels",
	ManageEvents: "commands.permissionManageEvents",
	ManageGuild: "commands.permissionManageGuild",
	ManageGuildExpressions: "commands.permissionManageGuildExpressions",
	ManageMessages: "commands.permissionManageMessages",
	ManageNicknames: "commands.permissionManageNicknames",
	ManageRoles: "commands.permissionManageRoles",
	ManageThreads: "commands.permissionManageThreads",
	ManageWebhooks: "commands.permissionManageWebhooks",
	MentionEveryone: "commands.permissionMentionEveryone",
	ModerateMembers: "commands.permissionModerateMembers",
	MoveMembers: "commands.permissionMoveMembers",
	ReadMessageHistory: "commands.permissionReadMessageHistory",
	SendMessages: "commands.permissionSendMessages",
	SendPolls: "commands.permissionSendPolls",
	Speak: "commands.permissionSpeak",
	ViewAuditLog: "commands.permissionViewAuditLog",
	ViewChannel: "commands.permissionViewChannel",
};

/** A flag the dashboard has not been told about yet is spaced out rather than shown as one word. */
export function permissionLabel(flag: string, t: TFunction): string {
	const key = PERMISSION_LABELS[flag];
	return key === undefined ? flag.replace(/([a-z])([A-Z])/g, "$1 $2") : t(key);
}
