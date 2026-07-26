import { randomInt } from "node:crypto";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { embed } from "../../../ui/embeds";

export default defineCommand({
	name: "iq",
	description: "Measures someone's totally scientific IQ.",
	category: Category.Fun,
	surfaces: ["slash", "prefix"],
	aliases: ["iqtest", "iqscore"],
	cooldownMs: 3_000,
	options: [{ name: "user", description: "Whose IQ to measure. Defaults to you.", type: "user" }],

	async execute(ctx) {
		const target = ctx.options.getUser("user") ?? ctx.user;
		const iq = randomInt(2, 201);
		const verdict = iq >= 120 ? "A genius. 🧠" : iq <= 50 ? "Keep learning and growing. 📚" : "Comfortably average.";

		await ctx.reply({
			embeds: [
				embed({
					category: Category.Fun,
					title: "IQ test",
					description: `${target}'s IQ is **${iq}**.\n${verdict}`,
					thumbnail: target.displayAvatarURL(),
					footer: `Requested by ${ctx.user.username}`,
				}),
			],
		});
	},
});
