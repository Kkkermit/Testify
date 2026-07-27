import { randomInt } from "node:crypto";
import { defineCommand } from "@core/command";
import { embed } from "@lib/embeds";
import { reply } from "@lib/reply";

export default defineCommand({
	name: "iq",
	description: "Measures someone's totally scientific IQ.",
	category: "fun",
	cooldown: 3_000,
	options: [{ name: "user", description: "Whose IQ to measure. Defaults to you.", type: "user" }],

	async run(interaction) {
		const target = interaction.options.getUser("user") ?? interaction.user;
		const iq = randomInt(2, 201);
		const verdict = iq >= 120 ? "A genius. 🧠" : iq <= 50 ? "Keep learning and growing. 📚" : "Comfortably average.";

		await reply(interaction, {
			embeds: [
				embed({
					category: "fun",
					title: "IQ test",
					description: `${target}'s IQ is **${iq}**.\n${verdict}`,
					thumbnail: target.displayAvatarURL(),
					footer: `Requested by ${interaction.user.username}`,
				}),
			],
		});
	},
});
