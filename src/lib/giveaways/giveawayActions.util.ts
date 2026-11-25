import { type GiveawaysManager } from "discord-giveaways";
import { type Guild, type User } from "discord.js";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { Giveaway, type GiveawayRecord } from "@database/models/giveaway.schema";
import { requireSendable } from "@lib/discord/channelPick.util";
import { giveaways } from "@lib/giveaways/giveaways.util";
import { GIVEAWAY_POST, type GiveawayRow } from "@testify/shared";

interface StartGiveaway {
	channelId: string;
	prize: string;
	winnerCount: number;
	durationMs: number;
	hostedBy: User;
}

export async function startGiveaway(client: TestifyClient, guild: Guild, draft: StartGiveaway): Promise<void> {
	await requireSendable(guild, draft.channelId);

	const channel = await guild.channels.fetch(draft.channelId);
	if (channel?.isTextBased() !== true) throw new UserFacingError("Pick a text channel in this server.");

	await giveaways(client).start(channel, {
		prize: draft.prize,
		winnerCount: draft.winnerCount,
		duration: draft.durationMs,
		hostedBy: draft.hostedBy,
		messages: GIVEAWAY_POST,
		// The prize is typed by whoever started it, so its win message pings people and never a role or everyone.
		allowedMentions: { parse: ["users"] },
	});
}

/** `discord-giveaways` finds a giveaway by message id in every server, so each action first checks it is this one's. */
function managerFor(client: TestifyClient, guildId: string, messageId: string, missing: string): GiveawaysManager {
	const manager = giveaways(client);
	if (!manager.giveaways.some((giveaway) => giveaway.messageId === messageId && giveaway.guildId === guildId)) {
		throw new UserFacingError(missing);
	}
	return manager;
}

export async function endGiveaway(client: TestifyClient, guildId: string, messageId: string): Promise<void> {
	const missing = "I could not find a running giveaway with that message id.";
	await managerFor(client, guildId, messageId, missing)
		.end(messageId)
		.catch(() => {
			throw new UserFacingError(missing);
		});
}

export async function rerollGiveaway(client: TestifyClient, guildId: string, messageId: string): Promise<void> {
	const missing = "I could not reroll that giveaway. Check the message id.";
	await managerFor(client, guildId, messageId, missing)
		.reroll(messageId)
		.catch(() => {
			throw new UserFacingError(missing);
		});
}

export async function deleteGiveaway(client: TestifyClient, guildId: string, messageId: string): Promise<void> {
	const missing = "I could not find a giveaway with that message id.";
	await managerFor(client, guildId, messageId, missing)
		.delete(messageId)
		.catch(() => {
			throw new UserFacingError(missing);
		});
}

/** Newest first: a manager opening the screen wants whatever is running now, not the oldest thing they ever ran. */
export async function listGiveaways(client: TestifyClient, guildId: string): Promise<GiveawayRow[]> {
	const rows = await Giveaway.find({ guildId }).sort({ startAt: -1 }).limit(50).lean<GiveawayRecord[]>().exec();

	return rows.map((record) => toRow(record, client));
}

/** One giveaway of this server's by its message, however long ago it ran. */
export async function findGiveaway(
	client: TestifyClient,
	guildId: string,
	messageId: string,
): Promise<GiveawayRow | null> {
	const record = await Giveaway.findOne({ guildId, messageId }).lean<GiveawayRecord>().exec();

	return record === null ? null : toRow(record, client);
}

function toRow(record: GiveawayRecord, client: TestifyClient): GiveawayRow {
	return {
		messageId: record.messageId,
		channelId: record.channelId,
		prize: record.prize,
		winnerCount: record.winnerCount,
		startAt: new Date(record.startAt).toISOString(),
		endAt: new Date(record.endAt).toISOString(),
		ended: record.ended,
		winners: (record.winnerIds ?? []).map((id) => ({ id, tag: client.users.cache.get(id)?.tag ?? null })),
		hostedBy: record.hostedBy ?? null,
	};
}
