import { setTimeout as wait } from "node:timers/promises";
import { defineCommand } from "@core/command";
import { UserFacingError } from "@core/errors";
import { embed, reply } from "@lib/discord";
import { HACK_STAGES, hackData, hackFields, hackProgress } from "@lib/games";

const STAGE_MS = 1_500;

export default defineCommand({
	name: "hack",
	description: "Pretends to hack the mentioned user. It is entirely fake.",
	category: "fun",
	guildOnly: true,
	cooldown: 30_000,
	options: [{ name: "user", description: "The user to 'hack'.", type: "user", required: true }],

	async run(interaction, client) {
		const target = interaction.options.getUser("user", true);
		if (target.id === client.user?.id) throw new UserFacingError("Nice try. I already know all my own passwords.");
		if (target.bot) throw new UserFacingError("Bots have nothing worth hacking. Pick a person.");

		const self = target.id === interaction.user.id;
		const name = target.username;

		await reply(interaction, {
			content: self ? `Hacking yourself, **${name}**? Bold. Starting…` : `Starting the process on **${name}**…`,
		});

		for (const [index, stage] of HACK_STAGES.entries()) {
			await wait(STAGE_MS);
			await interaction.editReply({ content: `${stage}\n${hackProgress(index + 1, HACK_STAGES.length)}` });
		}

		await wait(STAGE_MS);

		const result = embed({
			category: "fun",
			title: `${name}’s “data”`,
			description: "None of this is real. It is a joke command.",
			fields: hackFields(name, hackData()),
			thumbnail: target.displayAvatarURL(),
			footer: `Requested by ${interaction.user.username}`,
		});

		await interaction.editReply({ content: "✅ Mission complete.", embeds: [result] });
	},
});
