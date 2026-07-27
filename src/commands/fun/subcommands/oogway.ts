import { strings } from "../../../config/strings";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { containsProfanity } from "../../../lib/contentFilter";
import { embed } from "../../../lib/embeds";
import { reply } from "../../../lib/reply";

export default defineCommand({
	name: "master-oogway",
	description: "Shares a piece of Oogway's wisdom.",
	category: "fun",
	cooldown: 5_000,
	options: [
		{
			name: "quote",
			description: "The wisdom to share.",
			type: "string",
			required: true,
			maxLength: 200,
		},
	],

	async run(interaction) {
		const quote = interaction.options.getString("quote", true).trim();
		if (containsProfanity(quote)) throw new UserFacingError(strings.generic.profanity);

		await reply(interaction, {
			embeds: [
				embed({
					category: "fun",
					title: "🐢 Master Oogway's wisdom",
					description: `> *"${quote}"*\n> — Master Oogway`,
					footer: `Requested by ${interaction.user.username}`,
					footerIcon: interaction.user.displayAvatarURL(),
				}),
			],
		});
	},
});
