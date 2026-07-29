import { randomInt } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { defineCommand } from "@core/command";
import { jsonPath } from "@core/paths";
import { embed } from "@lib/embeds.util";
import { reply } from "@lib/reply.util";

let questions: string[] | undefined;

function pool(): string[] {
	questions ??= z.array(z.string()).parse(JSON.parse(readFileSync(jsonPath("wouldYouRather.json"), "utf8")));
	return questions;
}

export default defineCommand({
	name: "would-you-rather",
	description: "Poses a would-you-rather question.",
	category: "games",
	cooldown: 3_000,

	async run(interaction) {
		const question = pool()[randomInt(pool().length)] ?? "Would you rather?";

		await reply(interaction, {
			embeds: [embed({ category: "games", title: "Would you rather", description: `> ${question}` })],
		});
	},
});
