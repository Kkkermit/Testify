import { randomInt } from "node:crypto";
import { defineCommand, type CommandInput, type Subcommand } from "@core/command";
import { embed } from "@lib/embeds";
import { progressBar } from "@lib/format";
import { reply } from "@lib/reply";

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
	{ name: "smart", label: "smart", emoji: "🧠", description: "Shows someone's IQ." },
];

/**
 * Seven near-identical embed builders in the original collapsed into one renderer
 * driven by a table.
 */
async function renderMeter(interaction: CommandInput, meter: Meter): Promise<void> {
	const target = interaction.options.getUser("user") ?? interaction.user;

	if (meter.name === "smart") {
		const iq = randomInt(2, 201);
		const verdict = iq >= 120 ? "a genius 🧠" : iq <= 50 ? "still learning 📚" : "perfectly average";
		await reply(interaction, {
			embeds: [
				embed({
					category: "fun",
					title: `${meter.emoji} How smart is ${target.username}?`,
					description: `${target} has an IQ of **${iq}** — ${verdict}.`,
				}),
			],
		});
		return;
	}

	const percentage = randomInt(0, 101);
	await reply(interaction, {
		embeds: [
			embed({
				category: "fun",
				title: `${meter.emoji} How ${meter.label} is ${target.username}?`,
				description: `${target} is **${percentage}%** ${meter.label}.\n${progressBar(percentage, 100)}`,
			}),
		],
	});
}

const subcommands: Subcommand[] = METERS.map((meter) => ({
	name: meter.name,
	description: meter.description,
	options: [{ name: "user", description: "The user to measure.", type: "user" }],
	run: (interaction) => renderMeter(interaction, meter),
}));

export default defineCommand({
	name: "how",
	description: "Calculates how much of something you are. Results are definitely accurate.",
	category: "fun",
	subcommands,
	cooldown: 3_000,

	async run(interaction) {
		const requested = interaction.options.getSubcommand();
		const meter = METERS.find((candidate) => candidate.name === requested) ?? METERS[0]!;
		await renderMeter(interaction, meter);
	},
});
