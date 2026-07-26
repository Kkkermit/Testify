import { z } from "zod";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { fetchJson } from "../../../integrations/http";
import { embed } from "../../../ui/embeds";

const adviceSchema = z.object({ slip: z.object({ id: z.number(), advice: z.string() }) });

export default defineCommand({
	name: "advice",
	description: "Gets a piece of random advice.",
	category: Category.Community,
	surfaces: ["slash", "prefix"],
	cooldownMs: 5_000,

	async execute(ctx) {
		await ctx.defer();
		const payload = await fetchJson("adviceslip", "https://api.adviceslip.com/advice", adviceSchema);

		await ctx.reply({
			embeds: [
				embed({
					category: Category.Community,
					title: "Advice",
					description: `> ${payload.slip.advice}`,
					footer: `Slip #${payload.slip.id}`,
				}),
			],
		});
	},
});
