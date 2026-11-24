import { randomInt } from "node:crypto";
import { defineCommand, type CommandInput, type Subcommand } from "@core/command";
import { embed, reply } from "@lib/discord";
import { progressBar } from "@lib/format";

interface Meter {
	name: string;
	label: string;
	emoji: string;
	description: string;
}

const METERS: Meter[] = [
	{ name: "gay", label: "gay", emoji: "🌈", description: "Shows how gay someone is." },
	{ name: "sus", label: "sus", emoji: "🤨", description: "Shows how sus someone is." },
	{ name: "stupid", label: "stupid", emoji: "🤓", description: "Shows how stupid someone is." },
	{ name: "simp", label: "of a simp", emoji: "🥺", description: "Shows how much of a simp someone is." },
	{ name: "drunk", label: "drunk", emoji: "🍺", description: "Shows how drunk someone is." },
	{ name: "high", label: "high", emoji: "🍁", description: "Shows how high someone is." },
];

async function renderMeter(interaction: CommandInput, meter: Meter): Promise<void> {
	const target = interaction.options.getUser("user") ?? interaction.user;
	const percentage = randomInt(0, 101);

	await reply(interaction, {
		embeds: [
			embed({
				category: "fun",
				title: `${meter.emoji} How ${meter.label} is ${target.username}?`,
				description: `${target.toString()} is **${String(percentage)}%** ${meter.label}.\n${progressBar(percentage, 100)}`,
			}),
		],
	});
}

const subcommands: Subcommand[] = METERS.map((meter) => ({
	name: meter.name,
	description: meter.description,
	options: [{ name: "user", description: "Who to measure. Defaults to you.", type: "user" }],
	run: (interaction) => renderMeter(interaction, meter),
}));

export default defineCommand({
	name: "how",
	description: "Calculates how much of something you are. Results are definitely accurate.",
	category: "fun",
	subcommands,
	cooldown: 3_000,
});
