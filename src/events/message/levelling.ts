import { randomInt } from "node:crypto";
import { LEVELLING } from "../../config/constants";
import { theme } from "../../config/theme";
import { defineMessageHandler } from "../../core/message";
import { awardXp, getLevelSettings } from "../../database/repositories/levelRepository";

const CONGRATULATIONS = [
	"Congratulations {user}, you reached level **{level}**!",
	"{user} just hit level **{level}**. Nice work!",
	"Well done {user} \u2014 level **{level}**!",
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
		if (!message.guild) return;

		const settings = await getLevelSettings(message.guild.id);
		if (!settings || settings.isDisabled) return;

		const multiplier =
			settings.roleId !== null && message.member?.roles.cache.has(settings.roleId) === true
				? Math.max(1, settings.multiplier)
				: 1;

		const amount = randomInt(LEVELLING.xpPerMessageMin, LEVELLING.xpPerMessageMax + 1) * multiplier;
		const result = await awardXp(message.guild.id, message.author.id, amount);
		if (!result?.levelledUp) return;

		const target =
			settings.levelUpChannelId === null || settings.levelUpChannelId === "current"
				? message.channel
				: await client.channels.fetch(settings.levelUpChannelId).catch(() => null);

		if (!target?.isTextBased() || !target.isSendable()) return;

		const template = CONGRATULATIONS[randomInt(CONGRATULATIONS.length)]!;
		await target.send({
			content: `${theme.emoji.confetti} ${template
				.replace("{user}", `<@${message.author.id}>`)
				.replace("{level}", String(result.record.level))}`,
			allowedMentions: { users: [message.author.id] },
		});
	},
});
