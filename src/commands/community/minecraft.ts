import { z } from "zod";
import { defineCommand } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { embed } from "../../lib/embeds";
import { formatNumber, truncate } from "../../lib/format";
import { fetchJson } from "../../lib/http";
import { reply } from "../../lib/reply";

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
	category: "community",
	cooldown: 5_000,
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

	async run(interaction) {
		await interaction.deferReply();

		const address = interaction.options.getString("address", true).trim();
		const edition = interaction.options.getString("edition") ?? "java";
		const base = edition === "bedrock" ? "https://api.mcsrvstat.us/bedrock/3" : "https://api.mcsrvstat.us/3";

		const status = await fetchJson("mcsrvstat", `${base}/${encodeURIComponent(address)}`, statusSchema);
		if (!status.online) throw new UserFacingError(`**${address}** appears to be offline or does not exist.`);

		await reply(interaction, {
			embeds: [
				embed({
					category: "community",
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
