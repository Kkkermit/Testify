import { randomInt } from "node:crypto";
import { readFileSync } from "node:fs";
import { setTimeout as wait } from "node:timers/promises";
import { z } from "zod";
import { defineCommand } from "../../core/command";
import { jsonPath } from "../../core/paths";
import { embed } from "../../lib/embeds";
import { reply } from "../../lib/reply";

const hackDataSchema = z.object({
	id: z.array(z.string()),
	wifiName: z.array(z.string()),
	wifiPassword: z.array(z.string()),
	location: z.array(z.string()),
	dob: z.array(z.string()),
	creditCard: z.array(z.string()),
});

type HackData = z.infer<typeof hackDataSchema>;

let cached: HackData | undefined;

function hackData(): HackData {
	cached ??= hackDataSchema.parse(JSON.parse(readFileSync(jsonPath("hackUsers.json"), "utf8")));
	return cached;
}

function pick<T>(values: T[]): T {
	return values[randomInt(values.length)]!;
}

const STAGES = [
	"Getting the process ready…",
	"Installing the payload on their devices…",
	"Recovering device passwords and IDs…",
	"Locating their mum's credit card…",
	"Breaking into their Wi-Fi…",
	"Collecting personal information…",
	"Uploading everything to the cloud…",
];

export default defineCommand({
	name: "hack",
	description: "Pretends to hack the mentioned user. It is entirely fake.",
	category: "fun",
	guildOnly: true,
	cooldown: 30_000,
	options: [{ name: "user", description: "The user to 'hack'.", type: "user", required: true }],

	async run(interaction) {
		const target = interaction.options.getUser("user", true);
		const data = hackData();

		await reply(interaction, { content: `Starting the process on **${target.username}**…` });

		for (const stage of STAGES) {
			await wait(2_000);
			await interaction.editReply({ content: stage });
		}

		await wait(2_000);

		const result = embed({
			category: "fun",
			title: `${target.username}'s "data"`,
			description: "None of this is real. It is a joke command.",
			fields: [
				{
					name: "Device password",
					value: `\`${pick([`${target.username}845!!`, "1234567890", "Password123", "sg457DS3Sd"])}\``,
				},
				{ name: "ID", value: `\`${pick(data.id)}\`` },
				{ name: "Wi-Fi", value: `\`${pick(data.wifiName)}\` / \`${pick(data.wifiPassword)}\`` },
				{ name: "Location", value: `\`${pick(data.location)}\`` },
				{ name: "Email", value: `\`${target.username}${randomInt(10, 100)}@example.com\`` },
				{ name: "Date of birth", value: `\`${pick(data.dob)}\`` },
				{ name: "Credit card", value: `\`${pick(data.creditCard)}\`` },
			],
			thumbnail: target.displayAvatarURL(),
			footer: `Requested by ${interaction.user.username}`,
		});

		await interaction.editReply({ content: "Mission complete.", embeds: [result] });
	},
});
