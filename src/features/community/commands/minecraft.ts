import { z } from "zod";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { NotFoundError } from "../../../core/errors";
import { fetchJson } from "../../../integrations/http";
import { embed } from "../../../ui/embeds";
import { formatNumber, truncate } from "../../../ui/format";

const statusSchema = z.object({
	online: z.boolean(),
	ip: z.string().optional(),
	port: z.number().optional(),
	hostname: z.string().optional(),
	version: z.string().optional(),
	software: z.string().optional(),
	players: z
		.object({ online: z.number(), max: z.number(), list: z.array(z.object({ name: z.string() })).optional() })
		.optional(),
	motd: z.object({ clean: z.array(z.string()) }).optional(),
	icon: z.string().optional(),
});

export default defineCommand({
	name: "minecraft",
	description: "Checks the status of a Minecraft server.",
	category: Category.Community,
	surfaces: ["slash", "prefix"],
	aliases: ["mc"],
	cooldownMs: 5_000,
	options: [
		{ name: "address", description: "The server address.", type: "string", required: true },
		{
			name: "edition",
			description: "Java or Bedrock.",
			type: "string",
			choices: [
				{ name: "java", value: "java" },
				{ name: "bedrock", value: "bedrock" },
			],
		},
	],

	async execute(ctx) {
		await ctx.defer();

		const address = ctx.options.getString("address", true).trim();
		const edition = ctx.options.getString("edition") ?? "java";
		const base = edition === "bedrock" ? "https://api.mcsrvstat.us/bedrock/3" : "https://api.mcsrvstat.us/3";

		const status = await fetchJson("mcsrvstat", `${base}/${encodeURIComponent(address)}`, statusSchema);
		if (!status.online) throw new NotFoundError(`**${address}** appears to be offline or does not exist.`);

		await ctx.reply({
			embeds: [
				embed({
					category: Category.Community,
					title: status.hostname ?? address,
					description: truncate(status.motd?.clean.join("\n") ?? "No message of the day.", 500),
					fields: [
						{ name: "Status", value: "\u{1f7e2} Online", inline: true },
						{
							name: "Players",
							value: `${formatNumber(status.players?.online ?? 0)} / ${formatNumber(status.players?.max ?? 0)}`,
							inline: true,
						},
						{ name: "Version", value: status.version ?? "Unknown", inline: true },
						{ name: "Address", value: `${status.ip ?? address}:${status.port ?? 25_565}`, inline: true },
						{ name: "Software", value: status.software ?? "Unknown", inline: true },
					],
					footer: `${edition} edition`,
				}),
			],
		});
	},
});
