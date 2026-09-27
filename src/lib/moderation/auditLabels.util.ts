import { type AuditEvent } from "@testify/shared";

/** How the Discord panel names each audit event, so a select reads as English rather than gateway constants. */

export const AUDIT_EVENT_LABELS: Record<AuditEvent, { label: string; describes: string }> = {
	messageDelete: { label: "Message deleted", describes: "Someone's message was removed" },
	messageUpdate: { label: "Message edited", describes: "A message was changed" },
	channelCreate: { label: "Channel created", describes: "A new channel appeared" },
	channelDelete: { label: "Channel deleted", describes: "A channel was removed" },
	channelUpdate: { label: "Channel updated", describes: "A channel was renamed or reconfigured" },
	roleCreate: { label: "Role created", describes: "A new role was added" },
	roleDelete: { label: "Role deleted", describes: "A role was removed" },
	roleUpdate: { label: "Role updated", describes: "A role's name, colour or permissions changed" },
	memberJoin: { label: "Member joined", describes: "Someone joined the server" },
	memberLeave: { label: "Member left", describes: "Someone left or was removed" },
	memberUpdate: { label: "Member updated", describes: "Nickname or roles changed" },
	banAdd: { label: "Member banned", describes: "Someone was banned" },
	banRemove: { label: "Member unbanned", describes: "A ban was lifted" },
	emojiUpdate: { label: "Emoji changed", describes: "Server emoji were added or removed" },
	guildUpdate: { label: "Server updated", describes: "Server settings changed" },
	inviteUpdate: { label: "Invites changed", describes: "An invite was created or deleted" },
	threadUpdate: { label: "Threads changed", describes: "A thread was created, archived or deleted" },
	voiceUpdate: { label: "Voice activity", describes: "Members joining or leaving voice channels" },
};
