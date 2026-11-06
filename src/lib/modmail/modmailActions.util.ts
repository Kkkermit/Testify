import {
	type Attachment,
	ChannelType,
	type Guild,
	type GuildBasedChannel,
	type Message,
	type MessageCreateOptions,
	PermissionFlagsBits,
	type TextChannel,
	ThreadAutoArchiveDuration,
	type User,
} from "discord.js";
import { MINUTE_MS } from "@config/constants";
import { checkOpenControl, refusalText } from "@core/checks";
import { type TestifyClient } from "@core/client";
import { toError, UserFacingError } from "@core/errors";
import {
	claimConversation,
	closeConversation,
	countOpenConversations,
	dropConversation,
	getModmailSettings,
	modmailGuildIds,
	noteMessage,
	openConversationOf,
	saveModmailSettings,
	setConversationThread,
	type StoredConversation,
	type StoredModmailSettings,
} from "@database/repositories/modmailRepository";
import { MODMAIL_COMMAND } from "@lib/modmail/modmail.constants";
import { offerPanel, openedNotice, openingPost, staffSignature, threadName } from "@lib/modmail/modmailPanel.util";
import {
	messageChunks,
	MODMAIL_LIMITS,
	MODMAIL_NOTE_PREFIX,
	type ModmailConversation,
	type ModmailSettings,
	type ModmailSettingsPatch,
} from "@testify/shared";

/** Members writing to a server's staff in a private thread, relayed through the bot's direct messages both ways. */

/** What either side wrote is somebody's own words, which can mention anybody, so nothing relayed may ping. */
const SILENT = { allowedMentions: { parse: [] } } as const;

/** What the bot needs in the channel to make a thread per conversation and lock it when it closes. */
const NEEDED = [
	PermissionFlagsBits.ViewChannel,
	PermissionFlagsBits.SendMessages,
	PermissionFlagsBits.CreatePublicThreads,
	PermissionFlagsBits.SendMessagesInThreads,
	PermissionFlagsBits.ManageThreads,
];

function usableChannel(guild: Guild, channel: GuildBasedChannel | undefined): channel is TextChannel {
	const me = guild.members.me;
	return channel?.type === ChannelType.GuildText && me !== null && channel.permissionsFor(me).has(NEEDED);
}

export async function readModmailSettings(guild: Guild): Promise<ModmailSettings> {
	const [stored, open] = await Promise.all([getModmailSettings(guild.id), countOpenConversations(guild.id)]);
	const channelId = stored?.channelId ?? null;

	return {
		enabled: stored?.enabled ?? false,
		channelId,
		canUse: channelId !== null && usableChannel(guild, guild.channels.cache.get(channelId)),
		pingRoleId: stored?.pingRoleId ?? null,
		anonymous: stored?.anonymous ?? false,
		open,
	};
}

/** Mod mail cannot be on with nowhere to make threads, and never pings everybody when one opens. */
export async function applyModmailSettings(
	guild: Guild,
	patch: ModmailSettingsPatch,
	updatedBy: string | null,
): Promise<ModmailSettings> {
	const current = await readModmailSettings(guild);
	const channelId = patch.channelId === undefined ? current.channelId : patch.channelId;

	if (patch.enabled === true && channelId === null) {
		throw new UserFacingError("Pick a channel for mod mail before turning it on.");
	}
	if (patch.channelId !== undefined && patch.channelId !== null) {
		const channel = guild.channels.cache.get(patch.channelId);
		if (channel?.type !== ChannelType.GuildText) throw new UserFacingError("Pick a text channel for mod mail.");
		if (!usableChannel(guild, channel)) {
			throw new UserFacingError(
				"I need to send messages, create public threads and manage threads in that channel. Pick another, or let me.",
			);
		}
	}
	if (patch.pingRoleId !== undefined && patch.pingRoleId !== null) {
		if (patch.pingRoleId === guild.id) throw new UserFacingError("Mod mail will not ping everybody. Pick a role.");
		if (!guild.roles.cache.has(patch.pingRoleId)) throw new UserFacingError("That role is not in this server.");
	}

	const changes: Partial<StoredModmailSettings> = {
		enabled: channelId === null ? false : (patch.enabled ?? current.enabled),
		channelId,
		...(patch.pingRoleId === undefined ? {} : { pingRoleId: patch.pingRoleId }),
		...(patch.anonymous === undefined ? {} : { anonymous: patch.anonymous }),
	};
	await saveModmailSettings(guild.id, changes, updatedBy);
	return readModmailSettings(guild);
}

/** The pause, the blacklist and `/modmail`'s switch in that server, asked before every step a member takes. */
export async function requireModmailAccess(client: TestifyClient, userId: string, guildId: string): Promise<void> {
	const refused = await checkOpenControl(client, { userId, guildId }, MODMAIL_COMMAND);
	if (refused !== null) throw new UserFacingError(refusalText(refused));
}

/** Opens a thread for the member's first message; the claim goes first so two forms sent at once open one. */
export async function startConversation(
	client: TestifyClient,
	guild: Guild,
	user: User,
	firstMessage: string,
): Promise<{ conversation: StoredConversation; told: boolean }> {
	await requireModmailAccess(client, user.id, guild.id);

	const settings = await getModmailSettings(guild.id);
	if (settings?.enabled !== true || settings.channelId === null) {
		throw new UserFacingError(`**${guild.name}** does not take mod mail.`);
	}
	if ((await guild.members.fetch(user.id).catch(() => null)) === null) {
		throw new UserFacingError(`You are not in **${guild.name}**.`);
	}

	const channel = guild.channels.cache.get(settings.channelId);
	if (!usableChannel(guild, channel)) {
		throw new UserFacingError(`**${guild.name}**'s mod mail cannot take messages right now. Try again later.`);
	}

	const claimed = await claimConversation({ guildId: guild.id, userId: user.id, username: user.username });
	if (claimed === null) {
		const open = await openConversationOf(user.id);
		const where = client.guilds.cache.get(open?.guildId ?? "")?.name ?? "another server";
		throw new UserFacingError(
			`You already have a conversation open with the staff of **${where}**. Close it first, from the message I sent you.`,
		);
	}

	let threadId: string | null = null;
	try {
		const thread = await channel.threads.create({
			name: threadName(user.username),
			autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
			type: ChannelType.PublicThread,
			reason: "Mod mail",
		});
		threadId = thread.id;
		await setConversationThread(guild.id, claimed.id, thread.id);

		const ping = settings.pingRoleId;
		await thread.send({
			...openingPost(claimed, firstMessage, ping),
			allowedMentions: ping === null ? { parse: [] } : { roles: [ping] },
		});
	} catch (error) {
		if (threadId !== null) await guild.channels.delete(threadId).catch(() => undefined);
		await dropConversation(guild.id, claimed.id);
		client.logger.warn({ err: toError(error), guildId: guild.id }, "[MODMAIL] Could not open a thread for mod mail.");
		throw new UserFacingError("I could not open a thread for that. Try again later.");
	}

	const told = await user.send(openedNotice(guild.name, claimed.id, user.id)).then(
		() => true,
		() => false,
	);
	return { conversation: { ...claimed, threadId }, told };
}

/** A message, split to Discord's length, with what was attached sent on as files and as links if the files are refused. */
async function relay(
	target: { send(options: MessageCreateOptions): Promise<unknown> },
	header: string,
	message: Pick<Message, "content" | "attachments">,
): Promise<void> {
	const attachments: Attachment[] = [...message.attachments.values()].slice(0, 10);
	const chunks = messageChunks(message.content === "" ? header : `${header}\n${message.content}`);
	const last = chunks.pop() ?? header;

	for (const chunk of chunks) await target.send({ content: chunk, ...SILENT });
	if (attachments.length === 0) {
		await target.send({ content: last, ...SILENT });
		return;
	}

	const files = attachments.map((file) => ({ attachment: file.url, name: file.name }));
	await target.send({ content: last, files, ...SILENT }).catch(async () => {
		const links = attachments.map((file) => file.url).join("\n");
		await target.send({ content: messageChunks(`${last}\n${links}`)[0] ?? last, ...SILENT });
	});
}

/** A direct message from somebody with a conversation open goes to its thread; a thread that is gone ends it. */
export async function relayFromMember(
	client: TestifyClient,
	conversation: StoredConversation,
	message: Message,
): Promise<void> {
	const refused = await checkOpenControl(
		client,
		{ userId: conversation.userId, guildId: conversation.guildId },
		MODMAIL_COMMAND,
	);
	if (refused !== null) {
		await message.reply({ content: refusalText(refused), ...SILENT });
		return;
	}

	const guild = client.guilds.cache.get(conversation.guildId);
	const thread =
		guild === undefined || conversation.threadId === null
			? null
			: await guild.channels.fetch(conversation.threadId).catch(() => null);

	if (thread?.isThread() !== true || thread.locked === true) {
		await closeConversation(conversation.guildId, conversation.id, null);
		await message.reply({
			content: "📬 That conversation was closed by the server's staff. Write to me again to start a new one.",
			...SILENT,
		});
		return;
	}

	try {
		await relay(thread, `**${message.author.username}**`, message);
	} catch (error) {
		client.logger.warn(
			{ err: toError(error), guildId: conversation.guildId },
			"[MODMAIL] A message could not be passed to staff. Check the bot can send messages in threads there.",
		);
		await message.reply({ content: "⚠️ I could not pass that on. Try again in a moment.", ...SILENT });
		return;
	}
	await noteMessage(conversation.id, true);
	await message.react("✅").catch(() => undefined);
}

/** A staff message in the thread goes to the member, unless it is a note for the other staff. */
export async function relayFromStaff(
	client: TestifyClient,
	conversation: StoredConversation,
	message: Message<true>,
	settings: StoredModmailSettings,
): Promise<void> {
	if (message.content.startsWith(MODMAIL_NOTE_PREFIX)) return;

	const header = staffSignature(
		message.guild.name,
		message.member?.displayName ?? message.author.username,
		settings.anonymous,
	);
	try {
		const user = await client.users.fetch(conversation.userId);
		await relay(user, header, message);
		await noteMessage(conversation.id, false);
		await message.react("✅").catch(() => undefined);
	} catch (error) {
		client.logger.debug(
			{ err: toError(error), guildId: message.guild.id },
			"[MODMAIL] A reply could not be delivered.",
		);
		await message.reply({
			content:
				"⚠️ I could not deliver that: they have closed their direct messages, or no longer share a server with me.",
			...SILENT,
		});
	}
}

/** Only an open conversation can be closed; the thread is locked and whoever did not close it is told. */
export async function closeModmail(
	client: TestifyClient,
	guildId: string,
	conversationId: string,
	by: { id: string; name: string },
	side: "staff" | "member",
): Promise<StoredConversation> {
	const closed = await closeConversation(guildId, conversationId, by.id);
	if (closed === null) throw new UserFacingError("That conversation is already closed.");

	const guild = client.guilds.cache.get(guildId);
	const thread =
		guild === undefined || closed.threadId === null
			? null
			: await guild.channels.fetch(closed.threadId).catch(() => null);
	if (thread?.isThread() === true) {
		const line = side === "member" ? "🔒 They closed the conversation." : `🔒 Closed by ${by.name}.`;
		await thread.send({ content: line, ...SILENT }).catch(() => undefined);
		await thread.edit({ locked: true, archived: true }).catch(() => undefined);
	}

	if (side === "staff") {
		await client.users
			.fetch(closed.userId)
			.then((user) =>
				user.send({
					content: `📬 Your conversation with the staff of **${guild?.name ?? "that server"}** is closed. Write to me again to start a new one.`,
					...SILENT,
				}),
			)
			.catch(() => undefined);
	}

	return closed;
}

/** When each person was last offered the servers, so every direct message does not ask again. */
const offered = new Map<string, number>();

/** The servers this person is in that take mod mail; members the cache does not hold are fetched, up to a limit. */
async function sharedServers(client: TestifyClient, userId: string): Promise<{ id: string; name: string }[]> {
	const guilds = (await modmailGuildIds()).flatMap((id) => {
		const guild = client.guilds.cache.get(id);
		return guild === undefined ? [] : [guild];
	});
	const cached = guilds.filter((guild) => guild.members.cache.has(userId));
	const asked = guilds.filter((guild) => !guild.members.cache.has(userId)).slice(0, MODMAIL_LIMITS.maxServersOffered);
	const fetched = await Promise.all(
		asked.map(async (guild) => ((await guild.members.fetch(userId).catch(() => null)) === null ? null : guild)),
	);

	return [...cached, ...fetched.filter((guild) => guild !== null)]
		.slice(0, MODMAIL_LIMITS.maxServersOffered)
		.map((guild) => ({ id: guild.id, name: guild.name }));
}

/** A direct message from somebody with nothing open is answered with the servers they could write to, now and then. */
export async function offerModmail(client: TestifyClient, message: Message): Promise<boolean> {
	const userId = message.author.id;
	const last = offered.get(userId);
	if (last !== undefined && Date.now() - last < MODMAIL_LIMITS.offerEveryMinutes * MINUTE_MS) return false;

	const servers = await sharedServers(client, userId);
	if (servers.length === 0) return false;

	if (offered.size > 10_000) offered.clear();
	offered.set(userId, Date.now());
	await message.reply({ ...offerPanel(servers, userId), allowedMentions: { repliedUser: false } });
	return true;
}

export function clearModmailOffers(): void {
	offered.clear();
}

export function threadLink(conversation: Pick<StoredConversation, "guildId" | "threadId">): string | null {
	return conversation.threadId === null
		? null
		: `https://discord.com/channels/${conversation.guildId}/${conversation.threadId}`;
}

export function toConversationRow(conversation: StoredConversation): ModmailConversation {
	return {
		id: conversation.id,
		userId: conversation.userId,
		username: conversation.username,
		threadUrl: threadLink(conversation),
		openedAt: conversation.createdAt.toISOString(),
		lastMessageAt: conversation.lastMessageAt.toISOString(),
		waiting: conversation.waiting,
	};
}
