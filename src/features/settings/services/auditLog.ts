import { type APIEmbedField, type ColorResolvable, type Guild } from "discord.js";
import { theme } from "../../../config/theme";
import { type TestifyClient } from "../../../core/client";
import { toError } from "../../../core/errors";
import { getAuditLogConfig } from "../../../database/repositories/settingsRepository";
import { embed } from "../../../ui/embeds";

/**
 * Replaces `discord-logs` and the script that overwrote that package's source
 * inside `node_modules` — a patch every install destroyed. These handlers use
 * discord.js's own gateway events, so nothing needs patching.
 */
export const AUDIT_EVENTS = [
	"messageDelete",
	"messageUpdate",
	"channelCreate",
	"channelDelete",
	"channelUpdate",
	"roleCreate",
	"roleDelete",
	"roleUpdate",
	"memberJoin",
	"memberLeave",
	"memberUpdate",
	"banAdd",
	"banRemove",
	"emojiUpdate",
	"guildUpdate",
	"inviteUpdate",
	"threadUpdate",
	"voiceUpdate",
] as const;

export type AuditEvent = (typeof AUDIT_EVENTS)[number];

export interface AuditEntry {
	event: AuditEvent;
	title: string;
	description?: string;
	fields?: APIEmbedField[];
	color?: ColorResolvable;
	thumbnail?: string;
}

function isEnabled(enabled: string[], event: AuditEvent): boolean {
	return enabled.includes("all") || enabled.includes(event);
}

/** Posts one audit entry, silently doing nothing when the guild has not opted in. */
export async function writeAuditLog(client: TestifyClient, guild: Guild, entry: AuditEntry): Promise<void> {
	try {
		const config = await getAuditLogConfig(guild.id);
		if (!config || !isEnabled(config.enabledLogs, entry.event)) return;

		const channel = await client.channels.fetch(config.channelId).catch(() => null);
		if (!channel?.isTextBased() || !channel.isSendable()) return;

		await channel.send({
			embeds: [
				embed({
					color: entry.color ?? theme.colors.audit,
					title: `${theme.emoji.auditLog} ${entry.title}`,
					...(entry.description !== undefined ? { description: entry.description } : {}),
					...(entry.fields !== undefined ? { fields: entry.fields } : {}),
					...(entry.thumbnail !== undefined ? { thumbnail: entry.thumbnail } : {}),
					footer: entry.event,
				}),
			],
		});
	} catch (error) {
		client.logger.warn({ err: toError(error), guildId: guild.id }, "Could not write the audit log entry");
	}
}
