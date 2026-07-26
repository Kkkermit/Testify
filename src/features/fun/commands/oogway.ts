import { Category } from "../../../config/categories";
import { strings } from "../../../config/strings";
import { defineCommand } from "../../../core/command";
import { containsProfanity } from "../../../core/contentFilter";
import { UserFacingError } from "../../../core/errors";
import { embed } from "../../../ui/embeds";

export default defineCommand({
	name: "master-oogway",
	description: "Shares a piece of Oogway's wisdom.",
	category: Category.Fun,
	surfaces: ["slash", "prefix"],
	cooldownMs: 5_000,
	options: [
		{
			name: "quote",
			description: "The wisdom to share.",
			type: "string",
			required: true,
			maxLength: 200,
			greedy: true,
		},
	],

	async execute(ctx) {
		const quote = ctx.options.getString("quote", true).trim();
		if (containsProfanity(quote)) throw new UserFacingError(strings.generic.profanity);

		await ctx.reply({
			embeds: [
				embed({
					category: Category.Fun,
					title: "🐢 Master Oogway's wisdom",
					description: `> *"${quote}"*\n> — Master Oogway`,
					footer: `Requested by ${ctx.user.username}`,
					footerIcon: ctx.user.displayAvatarURL(),
				}),
			],
		});
	},
});
