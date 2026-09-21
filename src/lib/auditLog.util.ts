import { type APIEmbedField, type ColorResolvable, type Guild } from "discord.js";
import { theme } from "@config/theme";
import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { getAuditLogConfig } from "@database/repositories/settingsRepository";
import { embed } from "@lib/embeds.util";
import { AUDIT_EVENTS, type AuditEvent } from "@testify/shared";

/**
 * Replaces `discord-logs` and the script that overwrote that package's source inside `node_modules` — a patch every
 * install destroyed.
 *
 * The event list lives in `@testify/shared` so the dashboard's checklist and this file's dispatch cannot drift.
 */
export { AUDIT_EVENTS, type AuditEvent };

/**
 * The log's colour language, so a reader tells what happened from the stripe before reading the title: green
 * for something that appeared, red for something that went, amber for a change, and a darker red where a
 * moderator acted rather than something merely happening.
 */
const TONES = {
	created: theme.colours.success,
	restored: theme.colours.success,
	updated: theme.colours.warning,
	deleted: theme.colours.error,
	left: theme.colours.notice,
	moderated: theme.colours.severe,
} satisfies Record<string, ColorResolvable>;

export type AuditTone = keyof typeof TONES;

export interface AuditEntry {
	event: AuditEvent;
	title: string;
	description?: string;
	fields?: APIEmbedField[];
	tone?: AuditTone;
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
					colour: entry.tone === undefined ? theme.colours.audit : TONES[entry.tone],
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
