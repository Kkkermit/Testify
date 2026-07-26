import { randomInt } from "node:crypto";
import { Category } from "../../../config/categories";
import { defineCommand, type SharedSubcommand } from "../../../core/command";
import { type CommandContext } from "../../../core/context";
import { embed } from "../../../ui/embeds";
import { progressBar } from "../../../ui/format";

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
async function renderMeter(ctx: CommandContext, meter: Meter): Promise<void> {
	const target = ctx.options.getUser("user") ?? ctx.user;

	if (meter.name === "smart") {
		const iq = randomInt(2, 201);
		const verdict = iq >= 120 ? "a genius 🧠" : iq <= 50 ? "still learning 📚" : "perfectly average";
		await ctx.reply({
			embeds: [
				embed({
					category: Category.Fun,
					title: `${meter.emoji} How smart is ${target.username}?`,
					description: `${target} has an IQ of **${iq}** — ${verdict}.`,
				}),
			],
		});
		return;
	}

	const percentage = randomInt(0, 101);
	await ctx.reply({
		embeds: [
			embed({
				category: Category.Fun,
				title: `${meter.emoji} How ${meter.label} is ${target.username}?`,
				description: `${target} is **${percentage}%** ${meter.label}.\n${progressBar(percentage, 100)}`,
			}),
		],
	});
}

const subcommands: SharedSubcommand[] = METERS.map((meter) => ({
	name: meter.name,
	description: meter.description,
	options: [{ name: "user", description: "The user to measure.", type: "user" }],
	execute: (ctx) => renderMeter(ctx, meter),
}));

export default defineCommand({
	name: "how",
	description: "Calculates how much of something you are. Results are definitely accurate.",
	category: Category.Fun,
	surfaces: ["slash", "prefix"],
	subcommands,
	cooldownMs: 3_000,

	async execute(ctx) {
		const requested = ctx.options.getSubcommand();
		const meter = METERS.find((candidate) => candidate.name === requested) ?? METERS[0]!;
		await renderMeter(ctx, meter);
	},
});
