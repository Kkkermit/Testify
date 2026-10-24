import {
	DiscordAPIError,
	type Guild,
	type Message,
	type MessageReaction,
	type PartialMessageReaction,
	RESTJSONErrorCodes,
} from "discord.js";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import {
	claimStarPost,
	countStarPosts,
	deleteStarPost,
	findStarPost,
	findStarPostByBoardMessage,
	getStarboardSettings,
	markStarPostRemoved,
	recordStars,
	saveStarboardSettings,
	setBoardMessage,
	type StoredStarPost,
} from "@database/repositories/starboardRepository";
import { canPostIn } from "@lib/discord/channels.util";
import { VOTER_PAGE } from "@lib/starboard/starboard.constants";
import { starboardPost, starLine, starsFrom, type StarredMessage } from "@lib/starboard/starboardPanel.util";
import { STARBOARD_EMOJI, STARBOARD_LIMITS, type StarboardPatch, type StarboardSettings } from "@testify/shared";

export async function readStarboardSettings(guild: Guild): Promise<StarboardSettings> {
	const [stored, posts] = await Promise.all([getStarboardSettings(guild.id), countStarPosts(guild.id)]);
	const channelId = stored?.channelId ?? null;

	return {
		enabled: stored?.enabled ?? false,
		channelId,
		threshold: stored?.threshold ?? STARBOARD_LIMITS.defaultThreshold,
		selfStar: stored?.selfStar ?? false,
		canSend: channelId !== null && canPostIn(guild, channelId),
		posts,
	};
}

/** The board cannot be on with nowhere to post, so clearing its channel turns it off; a channel is checked as it is chosen. */
export async function applyStarboardSettings(
	guild: Guild,
	patch: StarboardPatch,
	updatedBy: string | null,
): Promise<StarboardSettings> {
	const current = await readStarboardSettings(guild);
	const channelId = patch.channelId === undefined ? current.channelId : patch.channelId;

	if (patch.enabled === true && channelId === null) {
		throw new UserFacingError("Pick a channel for the starboard before turning it on.");
	}
	if (patch.channelId !== undefined && patch.channelId !== null && !canPostIn(guild, patch.channelId)) {
		throw new UserFacingError("I cannot post in that channel. Pick one I can send messages to.");
	}

	await saveStarboardSettings(
		guild.id,
		{
			enabled: channelId === null ? false : (patch.enabled ?? current.enabled),
			channelId,
			threshold: patch.threshold ?? current.threshold,
			selfStar: patch.selfStar ?? current.selfStar,
		},
		updatedBy,
	);
	return readStarboardSettings(guild);
}

/** A number typed into the panel's form, refused in words rather than clamped behind the reader's back. */
export function parseThreshold(input: string): number {
	const value = Number(input.trim());
	const { minThreshold, maxThreshold } = STARBOARD_LIMITS;

	if (!Number.isInteger(value) || value < minThreshold || value > maxThreshold) {
		throw new UserFacingError(`Pick a whole number of stars from ${String(minThreshold)} to ${String(maxThreshold)}.`);
	}
	return value;
}

function starred(message: Message<true>): StarredMessage {
	const image =
		message.attachments.find((attachment) => attachment.contentType?.startsWith("image/") === true)?.url ??
		message.embeds.find((entry) => entry.image !== null || entry.thumbnail !== null)?.image?.url ??
		message.embeds.find((entry) => entry.thumbnail !== null)?.thumbnail?.url ??
		null;

	return {
		guildId: message.guildId,
		channelId: message.channelId,
		channelName: message.channel.name,
		messageId: message.id,
		authorName: message.member?.displayName ?? message.author.username,
		authorAvatar: message.author.displayAvatarURL({ size: 128 }),
		content: message.content,
		imageUrl: image,
	};
}

async function countStars(reaction: MessageReaction, authorId: string, selfStar: boolean): Promise<number> {
	if (reaction.count > VOTER_PAGE) return reaction.count;
	const voters = await reaction.users.fetch({ limit: VOTER_PAGE });
	return starsFrom([...voters.values()], authorId, selfStar);
}

/** Moves the count on a repost; one a moderator has deleted is remembered, so it is never posted again. */
async function updateRepost(guild: Guild, post: StoredStarPost, stars: number): Promise<void> {
	const updated = await recordStars(guild.id, post.messageId, stars);
	const boardChannelId = updated?.boardChannelId ?? null;
	const boardMessageId = updated?.boardMessageId ?? null;
	if (boardChannelId === null || boardMessageId === null) return;

	const board = await guild.channels.fetch(boardChannelId).catch(() => null);
	if (board?.isTextBased() !== true) return;

	await board.messages
		.edit(boardMessageId, { content: starLine(stars, post.channelId) })
		.catch(async (error: unknown) => {
			if (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.UnknownMessage) {
				await markStarPostRemoved(guild.id, post.messageId);
			}
		});
}

/** Called for every ⭐ added or taken away; anything else is ignored before a single query. */
export async function handleStarChange(
	client: TestifyClient,
	partial: MessageReaction | PartialMessageReaction,
): Promise<void> {
	if (client.paused || partial.emoji.name !== STARBOARD_EMOJI) return;
	const guild = partial.message.guild;
	if (guild === null) return;

	const settings = await getStarboardSettings(guild.id);
	if (settings?.enabled !== true || settings.channelId === null) return;
	// Stars on the board itself would repost the board to itself.
	if (partial.message.channelId === settings.channelId) return;

	const reaction = partial.partial ? await partial.fetch().catch(() => null) : partial;
	if (reaction === null) return;
	const message = reaction.message.partial ? await reaction.message.fetch().catch(() => null) : reaction.message;
	if (message?.inGuild() !== true || message.system) return;

	// Nothing from an age-restricted channel reaches a board that is not one.
	const board = await guild.channels.fetch(settings.channelId).catch(() => null);
	const sourceNsfw = "nsfw" in message.channel && message.channel.nsfw;
	const boardNsfw = board !== null && "nsfw" in board && board.nsfw;
	if (sourceNsfw && !boardNsfw) return;

	const existing = await findStarPost(guild.id, message.id);
	if (existing?.removed === true) return;
	// Below the line with nothing posted, the exact count cannot matter, so the voters are not fetched.
	if (existing === null && reaction.count < settings.threshold) return;

	const stars = await countStars(reaction, message.author.id, settings.selfStar);

	if (existing !== null) {
		await updateRepost(guild, existing, stars);
		return;
	}
	if (stars < settings.threshold) return;

	const { post, created } = await claimStarPost({
		guildId: guild.id,
		messageId: message.id,
		channelId: message.channelId,
		authorId: message.author.id,
		stars,
	});
	if (!created) {
		await updateRepost(guild, post, stars);
		return;
	}

	if (board?.isSendable() !== true) {
		// Let go of the claim, so the message can still make it once the channel is fixed.
		await deleteStarPost(guild.id, message.id);
		return;
	}

	const sent = await board.send(starboardPost(starred(message), stars));
	await setBoardMessage(guild.id, message.id, { channelId: board.id, messageId: sent.id });

	// A star that landed while this one was posting moved only the stored count.
	const latest = await findStarPost(guild.id, message.id);
	if (latest !== null && latest.stars !== stars)
		await sent.edit({ content: starLine(latest.stars, message.channelId) });
}

/** A deleted original takes its repost with it; a repost deleted from the board keeps the message off it. */
export async function handleStarredDelete(guild: Guild, messageId: string): Promise<void> {
	const original = await deleteStarPost(guild.id, messageId);

	if (original !== null) {
		if (original.boardChannelId === null || original.boardMessageId === null) return;
		const board = await guild.channels.fetch(original.boardChannelId).catch(() => null);
		if (board?.isTextBased() === true) await board.messages.delete(original.boardMessageId).catch(() => undefined);
		return;
	}

	const repost = await findStarPostByBoardMessage(guild.id, messageId);
	if (repost !== null) await markStarPostRemoved(guild.id, repost.messageId);
}
