import { type Guild, type GuildMember } from "discord.js";
import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { moderationBlock } from "@lib/moderation/moderationActions.util";
import { type BulkOutcome, type BulkSkip } from "@testify/shared";

/** One action on several members: each in turn, each answered for, and nobody ever acted on who should not be. */

export interface BulkActor {
	/** The session's own id, so the reader is skipped even when they are a bot owner outside the server. */
	readerId: string;
	/** Null for a bot owner who is not in the server, who outranks nobody. */
	moderator: GuildMember | null;
	botId: string | undefined;
}

export type Attempt = (member: GuildMember) => Promise<"done" | "already">;

function neverActedOn(guild: Guild, userId: string, actor: BulkActor): BulkSkip | null {
	if (userId === actor.readerId) return "you";
	if (userId === guild.ownerId) return "owner";
	if (userId === actor.botId) return "bot";
	return null;
}

async function actOnOne(
	guild: Guild,
	userId: string,
	actor: BulkActor,
	ranked: boolean,
	attempt: Attempt,
): Promise<BulkOutcome> {
	const member = await guild.members.fetch(userId).catch(() => null);
	const username = member?.user.username ?? null;

	const fixed = neverActedOn(guild, userId, actor);
	if (fixed !== null) return { userId, username, skipped: fixed };
	if (member === null) return { userId, username, skipped: "left" };

	if (ranked) {
		const block = actor.moderator === null ? "notMember" : moderationBlock(actor.moderator, member, actor.botId);
		if (block !== null) return { userId, username, skipped: block };
	}

	try {
		return { userId, username, skipped: (await attempt(member)) === "already" ? "already" : null };
	} catch (error) {
		(guild.client as TestifyClient).logger.debug(
			{ err: toError(error), guildId: guild.id, userId },
			"[MEMBERS] Discord refused one member of a bulk action. The rest carried on.",
		);
		return { userId, username, skipped: "failed" };
	}
}

/** `ranked` asks the moderation commands' role order of every member, as a kick, ban or timeout does. */
export async function actOnEach(
	guild: Guild,
	userIds: readonly string[],
	actor: BulkActor,
	ranked: boolean,
	attempt: Attempt,
): Promise<BulkOutcome[]> {
	const outcomes: BulkOutcome[] = [];
	// One at a time, so Discord's rate limits are met and one refusal cannot stop the rest.
	for (const userId of userIds) outcomes.push(await actOnOne(guild, userId, actor, ranked, attempt));

	return outcomes;
}
