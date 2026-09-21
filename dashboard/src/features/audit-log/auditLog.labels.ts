import { type AuditEvent, type AuditGroup } from "@testify/shared";
import { type TranslationKey } from "@/i18n";

/** What each audit event and group is called here; the grouping itself lives in `@testify/shared`. */

export const EVENT_LABELS: Record<AuditEvent, { label: TranslationKey; describes: TranslationKey }> = {
	messageDelete: { label: "auditLog.messageDelete", describes: "auditLog.messageDeleteAbout" },
	messageUpdate: { label: "auditLog.messageUpdate", describes: "auditLog.messageUpdateAbout" },
	channelCreate: { label: "auditLog.channelCreate", describes: "auditLog.channelCreateAbout" },
	channelDelete: { label: "auditLog.channelDelete", describes: "auditLog.channelDeleteAbout" },
	channelUpdate: { label: "auditLog.channelUpdate", describes: "auditLog.channelUpdateAbout" },
	roleCreate: { label: "auditLog.roleCreate", describes: "auditLog.roleCreateAbout" },
	roleDelete: { label: "auditLog.roleDelete", describes: "auditLog.roleDeleteAbout" },
	roleUpdate: { label: "auditLog.roleUpdate", describes: "auditLog.roleUpdateAbout" },
	memberJoin: { label: "auditLog.memberJoin", describes: "auditLog.memberJoinAbout" },
	memberLeave: { label: "auditLog.memberLeave", describes: "auditLog.memberLeaveAbout" },
	memberUpdate: { label: "auditLog.memberUpdate", describes: "auditLog.memberUpdateAbout" },
	banAdd: { label: "auditLog.banAdd", describes: "auditLog.banAddAbout" },
	banRemove: { label: "auditLog.banRemove", describes: "auditLog.banRemoveAbout" },
	emojiUpdate: { label: "auditLog.emojiUpdate", describes: "auditLog.emojiUpdateAbout" },
	guildUpdate: { label: "auditLog.guildUpdate", describes: "auditLog.guildUpdateAbout" },
	inviteUpdate: { label: "auditLog.inviteUpdate", describes: "auditLog.inviteUpdateAbout" },
	threadUpdate: { label: "auditLog.threadUpdate", describes: "auditLog.threadUpdateAbout" },
	voiceUpdate: { label: "auditLog.voiceUpdate", describes: "auditLog.voiceUpdateAbout" },
};

export const GROUP_LABELS: Record<AuditGroup, TranslationKey> = {
	Messages: "auditLog.groupMessages",
	Channels: "auditLog.groupChannels",
	Roles: "auditLog.groupRoles",
	Members: "auditLog.groupMembers",
	Server: "auditLog.groupServer",
};
