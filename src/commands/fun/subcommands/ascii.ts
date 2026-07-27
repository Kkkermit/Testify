import figlet from "figlet";
import { strings } from "../../../config/strings";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { containsProfanity } from "../../../lib/contentFilter";
import { embed } from "../../../lib/embeds";
import { reply } from "../../../lib/reply";

export default defineCommand({
	name: "ascii",
	description: "Converts text into ASCII art.",
	category: "fun",
	cooldown: 5_000,
	options: [
		{
			name: "text",
			description: "The text to convert.",
			type: "string",
			required: true,
			maxLength: 15,
		},
	],

	async run(interaction) {
		const text = interaction.options.getString("text", true).slice(0, 15);
		if (containsProfanity(text)) throw new UserFacingError(strings.generic.profanity);

		let art: string;
		try {
			art = figlet.textSync(text);
		} catch {
			throw new UserFacingError("That text could not be rendered.");
		}

		await reply(interaction, { embeds: [embed({ category: "fun", description: `\`\`\`\n${art}\n\`\`\`` })] });
	},
});
