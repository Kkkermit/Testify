import { randomInt } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { jsonPath } from "../../../core/paths";
import { embed } from "../../../ui/embeds";

let questions: string[] | undefined;

function pool(): string[] {
	questions ??= z.array(z.string()).parse(JSON.parse(readFileSync(jsonPath("wouldYouRather.json"), "utf8")));
	return questions;
}

export default defineCommand({
	name: "would-you-rather",
	description: "Poses a would-you-rather question.",
	category: Category.MiniGames,
	surfaces: ["slash", "prefix"],
	aliases: ["wyr"],
	cooldownMs: 3_000,

	async execute(ctx) {
		const question = pool()[randomInt(pool().length)] ?? "Would you rather?";

		await ctx.reply({
			embeds: [embed({ category: Category.MiniGames, title: "Would you rather", description: `> ${question}` })],
		});
	},
});
