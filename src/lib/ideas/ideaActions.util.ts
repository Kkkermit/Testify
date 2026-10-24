import { type Guild } from "discord.js";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import {
	countIdeas,
	createIdea,
	decideIdea,
	deleteIdea,
	getIdeaSettings,
	lastIdeaAt,
	saveIdeaSettings,
	setIdeaMessage,
	type StoredIdea,
	takeIdeaNumber,
} from "@database/repositories/ideaRepository";
import { canPostIn } from "@lib/discord/channels.util";
import { decisionText, ideaPost } from "@lib/ideas/ideaPanel.util";
import { IDEA_PAUSE_MS } from "@lib/ideas/ideas.constants";
import {
	IDEA_LIMITS,
	type IdeaRow,
	type IdeaSettings,
	type IdeaSettingsPatch,
	type IdeaStatus,
	sanitiseText,
} from "@testify/shared";

/** Posting, voting on and deciding ideas, shared by `/idea`, the buttons on each post and the dashboard. */

const NOT_SET_UP = "This server has no idea board yet. A manager can set one up with `/idea settings`.";

export async function readIdeaSettings(guild: Guild): Promise<IdeaSettings> {
	const [stored, counts] = await Promise.all([getIdeaSettings(guild.id), countIdeas(guild.id)]);
	const channelId = stored?.channelId ?? null;

	return {
		enabled: stored?.enabled ?? false,
		channelId,
		canSend: channelId !== null && canPostIn(guild, channelId),
		counts,
	};
}

/** The board cannot be on with nowhere to post, so clearing its channel turns it off; a channel is checked as it is chosen. */
export async function applyIdeaSettings(
	guild: Guild,
	patch: IdeaSettingsPatch,
	updatedBy: string | null,
): Promise<IdeaSettings> {
	const current = await readIdeaSettings(guild);
	const channelId = patch.channelId === undefined ? current.channelId : patch.channelId;
	const enabled = patch.enabled ?? current.enabled;

	if (patch.enabled === true && channelId === null) {
		throw new UserFacingError("Pick a channel for ideas before turning the board on.");
	}
	if (patch.channelId !== undefined && patch.channelId !== null && !canPostIn(guild, patch.channelId)) {
		throw new UserFacingError("I cannot post in that channel. Pick one I can send messages to.");
	}

	await saveIdeaSettings(guild.id, { enabled: channelId === null ? false : enabled, channelId }, updatedBy);
	return readIdeaSettings(guild);
}

export function ideaText(input: string): string {
	const value = sanitiseText(input);

	if (value === "") throw new UserFacingError("Say what your idea is.");
	if (value.length > IDEA_LIMITS.maxText) {
		throw new UserFacingError(`Keep an idea under ${IDEA_LIMITS.maxText.toLocaleString()} characters.`);
	}

	return value;
}

/** The post mentions its author, and a member's text can mention anybody, so nothing it sends may ping. */
const SILENT = { allowedMentions: { parse: [] } };

export async function submitIdea(
	guild: Guild,
	author: { id: string; username: string },
	input: string,
	now: Date = new Date(),
): Promise<StoredIdea> {
	const text = ideaText(input);
	const settings = await getIdeaSettings(guild.id);
	if (settings?.enabled !== true || settings.channelId === null) throw new UserFacingError(NOT_SET_UP);

	const last = await lastIdeaAt(guild.id, author.id);
	if (last !== null && now.getTime() - last.getTime() < IDEA_PAUSE_MS) {
		const ready = Math.ceil((last.getTime() + IDEA_PAUSE_MS) / 1_000);
		throw new UserFacingError(`You posted an idea a moment ago. You can post another <t:${String(ready)}:R>.`);
	}

	const channel = await guild.channels.fetch(settings.channelId).catch(() => null);
	if (channel?.isSendable() !== true) {
		throw new UserFacingError("I cannot post in the idea channel any more. Ask a manager to check `/idea settings`.");
	}

	const idea = await createIdea({
		guildId: guild.id,
		number: await takeIdeaNumber(guild.id),
		channelId: settings.channelId,
		authorId: author.id,
		authorName: author.username,
		text,
	});

	try {
		const sent = await channel.send({ ...ideaPost(idea), ...SILENT });
		await setIdeaMessage(guild.id, idea.id, sent.id);
		return { ...idea, messageId: sent.id };
	} catch (error) {
		// An idea nobody can see is not one, so the record goes with the post that failed.
		await deleteIdea(guild.id, idea.id);
		throw error;
	}
}

/** Re-renders the post from what is stored; a post that has been deleted is left that way. */
export async function refreshIdeaPost(guild: Guild, idea: StoredIdea): Promise<void> {
	if (idea.messageId === null) return;

	const channel = await guild.channels.fetch(idea.channelId).catch(() => null);
	if (channel?.isTextBased() !== true) return;

	const message = await channel.messages.fetch(idea.messageId).catch(() => null);
	await message?.edit({ ...ideaPost(idea), ...SILENT });
}

export function ideaLink(idea: Pick<StoredIdea, "guildId" | "channelId" | "messageId">): string | null {
	return idea.messageId === null
		? null
		: `https://discord.com/channels/${idea.guildId}/${idea.channelId}/${idea.messageId}`;
}

/** Records the decision, updates the post, and tells the author; a closed DM costs only the DM. */
export async function decideOnIdea(
	client: TestifyClient,
	guild: Guild,
	ideaId: string,
	decision: { status: IdeaStatus; reason: string },
	by: { id: string; name: string },
): Promise<StoredIdea> {
	const decided = await decideIdea(guild.id, ideaId, { ...decision, by: by.id, byName: by.name, at: new Date() });
	if (decided === null) throw new UserFacingError("That idea has been deleted.");

	await refreshIdeaPost(guild, decided);

	if (decided.status !== "open") {
		await client.users
			.fetch(decided.authorId)
			.then((user) => user.send({ content: decisionText(decided, guild.name, ideaLink(decided)), ...SILENT }))
			.catch(() => {
				client.logger.debug({ guildId: guild.id }, "[IDEAS] Could not tell an idea's author what was decided.");
			});
	}

	return decided;
}

/** Takes the post down with the record. */
export async function removeIdea(guild: Guild, ideaId: string): Promise<StoredIdea | null> {
	const removed = await deleteIdea(guild.id, ideaId);
	if (removed?.messageId === null || removed === null) return removed;

	const channel = await guild.channels.fetch(removed.channelId).catch(() => null);
	if (channel?.isTextBased() === true) await channel.messages.delete(removed.messageId).catch(() => undefined);

	return removed;
}

export function toIdeaRow(idea: StoredIdea): IdeaRow {
	return {
		id: idea.id,
		number: idea.number,
		authorId: idea.authorId,
		authorName: idea.authorName,
		text: idea.text,
		status: idea.status,
		reason: idea.reason,
		decidedByName: idea.decidedByName,
		decidedAt: idea.decidedAt?.toISOString() ?? null,
		up: idea.upVoters.length,
		down: idea.downVoters.length,
		createdAt: idea.createdAt.toISOString(),
		messageUrl: ideaLink(idea),
	};
}
