import { type Message } from "discord.js";
import { AFK } from "@config/constants";
import { type TestifyClient } from "@core/client";
import { defineMessageHandler } from "@core/message";
import { parseMessage } from "@core/prefix";
import { clearAfk, findAway } from "@database/repositories/afkRepository";
import { getPrefix } from "@database/repositories/prefixRepository";
import { AFK_COMMAND, awayNotice, shouldTell, welcomeBack } from "@lib/afk";
import { replyTemporarily } from "@lib/discord";

/** The message that sets a note must not be the message that clears it. */
async function setsAway(message: Message<true>, client: TestifyClient): Promise<boolean> {
	const parsed = parseMessage(message.content, await getPrefix(message.guildId), client.user?.id ?? "");
	if (parsed === null) return false;
	return (client.aliases.get(parsed.name) ?? parsed.name) === AFK_COMMAND;
}

/** Runs ahead of the prefix commands, so a member who is away comes back before anything they typed is answered. */
export default defineMessageHandler({
	name: "afk",
	order: 2,
	async run(message, client) {
		if (!message.inGuild()) return;

		if (!(await setsAway(message, client))) {
			const cleared = await clearAfk(message.guildId, message.author.id);
			if (cleared !== null) {
				await replyTemporarily(client, message, welcomeBack(cleared), AFK.noticeShowsMs, true);
			}
		}

		const mentioned = new Map(
			[...message.mentions.users].filter(([id, user]) => !user.bot && id !== message.author.id),
		);
		const replied = message.mentions.repliedUser;
		if (replied !== null && !replied.bot && replied.id !== message.author.id) mentioned.set(replied.id, replied);
		if (mentioned.size === 0) return;

		const away = new Map(
			(await findAway(message.guildId, [...mentioned.keys()]))
				.filter((record) => shouldTell(message.guildId, message.channelId, record.userId))
				.map((record) => [record.userId, record]),
		);
		if (away.size === 0) return;

		const members = [...mentioned.values()].flatMap((user) => {
			const record = away.get(user.id);
			if (record === undefined) return [];
			const name = message.guild.members.cache.get(user.id)?.displayName ?? user.username;
			return [{ name, note: record.note, since: record.updatedAt }];
		});
		await replyTemporarily(client, message, awayNotice(members), AFK.noticeShowsMs, true);
	},
});
