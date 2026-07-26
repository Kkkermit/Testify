import figlet from "figlet";
import { Category } from "../../../config/categories";
import { strings } from "../../../config/strings";
import { defineCommand } from "../../../core/command";
import { containsProfanity } from "../../../core/contentFilter";
import { UserFacingError } from "../../../core/errors";
import { embed } from "../../../ui/embeds";

export default defineCommand({
	name: "ascii",
	description: "Converts text into ASCII art.",
	category: Category.Fun,
	surfaces: ["slash", "prefix"],
	cooldownMs: 5_000,
	options: [
		{
			name: "text",
			description: "The text to convert.",
			type: "string",
			required: true,
			maxLength: 15,
			greedy: true,
		},
	],

	async execute(ctx) {
		const text = ctx.options.getString("text", true).slice(0, 15);
		if (containsProfanity(text)) throw new UserFacingError(strings.generic.profanity);

		let art: string;
		try {
			art = figlet.textSync(text);
		} catch {
			throw new UserFacingError("That text could not be rendered.");
		}

		await ctx.reply({ embeds: [embed({ category: Category.Fun, description: `\`\`\`\n${art}\n\`\`\`` })] });
	},
});
