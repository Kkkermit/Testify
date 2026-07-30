import { randomInt } from "node:crypto";
import { LEVELLING } from "@config/constants";
import { theme } from "@config/theme";
import { defineMessageHandler } from "@core/message";
import { awardXp, getLevelSettings } from "@database/repositories/levelRepository";
import { earnsXp, multiplierFor, normaliseSettings } from "@lib/levelling.util";
import { applyLevelRewards } from "@lib/levellingActions.util";

const CONGRATULATIONS = [
	"Congratulations {user}, you reached level **{level}**!",
	"{user} just hit level **{level}**. Nice work!",
	"Well done {user} — level **{level}**!",
	"{user} levelled up to **{level}**!",
];

/**
 * XP is awarded once per cooldown window through an atomic update. The previous
 * handler added the multiplied amount and then the base amount again, and had no
 * cooldown at all, so XP was trivially farmable.
 */
export default defineMessageHandler({
	name: "levelling",
	order: 40,
	async run(message, client) {
		if (!message.guild || message.member === null) return;

		const config = normaliseSettings(await getLevelSettings(message.guild.id));
		const roleIds = [...message.member.roles.cache.keys()];
		if (!earnsXp(config, message.channelId, roleIds)) return;

		const amount = randomInt(LEVELLING.xpPerMessageMin, LEVELLING.xpPerMessageMax + 1) * multiplierFor(config, roleIds);
		const result = await awardXp(message.guild.id, message.author.id, amount);
		if (!result?.levelledUp) return;

		const level = result.record.level;
		await applyLevelRewards(message.member, config, level, client.logger);

		if (!config.announce) return;

		const target =
			config.levelUpChannelId === null
				? message.channel
				: await client.channels.fetch(config.levelUpChannelId).catch(() => null);

		if (!target?.isTextBased() || !target.isSendable()) return;

		const template = CONGRATULATIONS[randomInt(CONGRATULATIONS.length)]!;
		await target.send({
			content: `${theme.emoji.confetti} ${template
				.replace("{user}", `<@${message.author.id}>`)
				.replace("{level}", String(level))}`,
			allowedMentions: { users: [message.author.id] },
		});
	},
});
