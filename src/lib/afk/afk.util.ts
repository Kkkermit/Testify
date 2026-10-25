import { type EmbedBuilder } from "discord.js";
import { AFK } from "@config/constants";
import { UserFacingError } from "@core/errors";
import { setAfk, type StoredAfk } from "@database/repositories/afkRepository";
import { embed } from "@lib/discord/embeds.util";
import { discordTime, escapeMarkdown, formatDurationLong } from "@lib/format/format.util";
import { sanitiseLine } from "@testify/shared";

/** Away notes: set with `/afk`, shown to whoever mentions their member, and cleared when that member next speaks. */

export interface AwayMember {
	name: string;
	note: string;
	since: Date;
}

export async function goAway(guildId: string, userId: string, note: string | null): Promise<StoredAfk> {
	const cleaned = sanitiseLine(note ?? "");
	if (cleaned.length > AFK.maxNote) {
		throw new UserFacingError(`Keep your note to ${String(AFK.maxNote)} characters.`);
	}
	return setAfk(guildId, userId, cleaned);
}

export function awayConfirm(record: StoredAfk): EmbedBuilder {
	return embed({
		category: "community",
		title: "💤 You are away",
		description: [
			record.note === ""
				? "Anybody who mentions you here is told you are away."
				: `Anybody who mentions you here is told: ${record.note}`,
			"It comes off the next time you send a message in this server.",
		].join("\n"),
	});
}

/** Each member once per line, with their note and when they went, in the order they were mentioned. */
export function awayNotice(members: readonly AwayMember[]): EmbedBuilder {
	return embed({
		category: "community",
		description: members
			.map((member) => {
				const note = member.note === "" ? "" : `: ${member.note}`;
				return `💤 **${escapeMarkdown(member.name)}** is away${note} · ${discordTime(member.since, "R")}`;
			})
			.join("\n"),
	});
}

export function welcomeBack(record: StoredAfk, now: number = Date.now()): EmbedBuilder {
	return embed({
		category: "community",
		description: `👋 Welcome back. Your away note is off — you were away for ${formatDurationLong(now - record.updatedAt.getTime())}.`,
	});
}

/** When each channel was last told that a member is away, so a busy conversation is not told on every message. */
const lastTold = new Map<string, number>();

export function shouldTell(guildId: string, channelId: string, userId: string, now: number = Date.now()): boolean {
	const key = `${guildId}:${channelId}:${userId}`;
	const last = lastTold.get(key);
	if (last !== undefined && now - last < AFK.noticeEveryMs) return false;

	if (lastTold.size > 1_000) {
		for (const [entry, at] of lastTold) if (now - at >= AFK.noticeEveryMs) lastTold.delete(entry);
	}
	lastTold.set(key, now);
	return true;
}
