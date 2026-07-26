import { randomInt } from "node:crypto";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { requireTextChannel } from "../../../core/guards";
import { embed } from "../../../ui/embeds";

export default defineCommand({
	name: "guess-the-number",
	description: "Guess the number the bot is thinking of.",
	category: Category.MiniGames,
	surfaces: ["slash", "prefix"],
	aliases: ["gtn"],
	guildOnly: true,
	cooldownMs: 10_000,
	options: [
		{ name: "maximum", description: "The highest possible number.", type: "integer", minValue: 10, maxValue: 1_000 },
	],

	async execute(ctx) {
		const channel = requireTextChannel(ctx);
		const maximum = ctx.options.getInteger("maximum") ?? 100;
		const target = randomInt(1, maximum + 1);

		await ctx.reply({
			embeds: [
				embed({
					category: Category.MiniGames,
					title: "Guess the number",
					description: `I am thinking of a number between **1** and **${maximum}**. You have 60 seconds and six guesses.`,
				}),
			],
		});

		const collector = channel.createMessageCollector({
			filter: (message) => !message.author.bot && /^\d{1,4}$/.test(message.content.trim()),
			time: 60_000,
			max: 6,
		});

		await new Promise<void>((resolve) => {
			collector.on("collect", (message) => {
				const guess = Number.parseInt(message.content.trim(), 10);
				if (guess === target) {
					collector.stop("won");
					void message.reply({
						embeds: [
							embed({
								category: Category.MiniGames,
								title: "Correct",
								description: `${message.author} got it \u2014 the number was **${target}**.`,
							}),
						],
					});
					return;
				}

				void message.react(guess < target ? "\u2b06\ufe0f" : "\u2b07\ufe0f").catch(() => null);
			});

			collector.on("end", (_collected, reason) => {
				if (reason !== "won" && channel.isSendable()) {
					void channel.send({
						embeds: [
							embed({
								category: Category.MiniGames,
								title: "Game over",
								description: `Nobody guessed it. The number was **${target}**.`,
							}),
						],
					});
				}
				resolve();
			});
		});
	},
});
