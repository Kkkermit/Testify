import {
	DiscordAPIError,
	type Guild,
	type Message,
	type MessageReaction,
	type PartialMessageReaction,
	ReactionType,
	RESTJSONErrorCodes,
} from "discord.js";
import { MINUTE_MS } from "@config/constants";
import { type TestifyClient } from "@core/client";
import { toError, UserFacingError } from "@core/errors";
import {
	claimStarPost,
	countStarPosts,
	deleteStarPost,
	findStarPost,
	findStarPostByBoardMessage,
	getStarboardSettings,
	markStarPostRemoved,
	recordStars,
	releaseStaleClaim,
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

/** The stars that count, and whether the author's own was left out, which is the usual surprise. */
async function countStars(
	reaction: MessageReaction,
	authorId: string,
	selfStar: boolean,
): Promise<{ stars: number; ownStar: boolean }> {
	if (reaction.count > VOTER_PAGE) return { stars: reaction.count, ownStar: false };
	const normal = await reaction.users.fetch({ limit: VOTER_PAGE });
	// Super reactions are listed on their own, and the count holds both kinds.
	const all =
		normal.size < reaction.count
			? normal.concat(await reaction.users.fetch({ limit: VOTER_PAGE, type: ReactionType.Burst }))
			: normal;
	const voters = [...all.values()];
	return {
		stars: starsFrom(voters, authorId, selfStar),
		ownStar: !selfStar && voters.some((voter) => voter.id === authorId),
	};
}

/** 50001 and 50013: a permission the operator can grant. */
const NO_ACCESS = new Set<number>([RESTJSONErrorCodes.MissingAccess, RESTJSONErrorCodes.MissingPermissions]);

function lacksAccess(error: unknown): boolean {
	return error instanceof DiscordAPIError && NO_ACCESS.has(Number(error.code));
}

/** A claim this old that never posted was left by a run that failed, and would keep its message off the board. */
const STALE_CLAIM_MS = MINUTE_MS;

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

	const where = { guildId: guild.id, channelId: partial.message.channelId, messageId: partial.message.id };
	const trace = (reason: string): void => {
		client.logger.debug(where, `[STARBOARD] ${reason}`);
	};

	const settings = await getStarboardSettings(guild.id);
	if (settings?.enabled !== true || settings.channelId === null) return trace("The starboard is off in this server.");
	// Stars on the board itself would repost the board to itself.
	if (partial.message.channelId === settings.channelId) return trace("A ⭐ on the board itself does not count.");

	const unreadable = (error: unknown): null => {
		if (lacksAccess(error)) {
			client.logger.warn(
				where,
				"[STARBOARD] I cannot read a starred message. Give me View Channel and Read Message History in its channel.",
			);
		} else {
			client.logger.debug({ ...where, err: toError(error) }, "[STARBOARD] A starred message was gone.");
		}
		return null;
	};
	const reaction = partial.partial ? await partial.fetch().catch(unreadable) : partial;
	if (reaction === null) return;
	const message = reaction.message.partial ? await reaction.message.fetch().catch(unreadable) : reaction.message;
	if (message?.inGuild() !== true || message.system) return;

	// Nothing from an age-restricted channel reaches a board that is not one.
	const board = await guild.channels.fetch(settings.channelId).catch(() => null);
	const sourceNsfw = "nsfw" in message.channel && message.channel.nsfw;
	const boardNsfw = board !== null && "nsfw" in board && board.nsfw;
	if (sourceNsfw && !boardNsfw)
		return trace("A ⭐ in an age-restricted channel does not reach a board that is not one.");

	let existing = await findStarPost(guild.id, message.id);
	if (existing?.removed === true) return trace("A moderator took this message's repost down, so it stays off.");
	if (
		existing?.boardMessageId === null &&
		(await releaseStaleClaim(guild.id, message.id, new Date(Date.now() - STALE_CLAIM_MS)))
	) {
		existing = null;
	}
	// Below the line with nothing posted, the exact count cannot matter, so the voters are not fetched.
	if (existing === null && reaction.count < settings.threshold) {
		return trace(`It has ${String(reaction.count)} of the ${String(settings.threshold)} ⭐ it needs.`);
	}

	const { stars, ownStar } = await countStars(reaction, message.author.id, settings.selfStar);

	if (existing !== null) {
		await updateRepost(guild, existing, stars);
		return;
	}
	if (stars < settings.threshold) {
		return trace(
			ownStar
				? `The author's own ⭐ does not count here, which leaves ${String(stars)} of the ${String(settings.threshold)} it needs.`
				: `It has ${String(stars)} of the ${String(settings.threshold)} ⭐ it needs.`,
		);
	}

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

	// Every way out short of a repost lets go of the claim, so the message can still make it once the board is fixed.
	if (board?.isSendable() !== true) {
		await deleteStarPost(guild.id, message.id);
		client.logger.warn(where, "[STARBOARD] The board's channel is gone. Pick another with /starboard.");
		return;
	}
	const sent = await board.send(starboardPost(starred(message), stars)).catch(async (error: unknown) => {
		await deleteStarPost(guild.id, message.id);
		if (!lacksAccess(error)) throw error;
		client.logger.warn(
			{ ...where, boardId: board.id },
			"[STARBOARD] I cannot post on the board. Give me View Channel, Send Messages and Embed Links in its channel.",
		);
		return null;
	});
	if (sent === null) return;
	await setBoardMessage(guild.id, message.id, { channelId: board.id, messageId: sent.id });
	trace(`Reposted it with ${String(stars)} ⭐.`);

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
