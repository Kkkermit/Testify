import { randomInt } from "node:crypto";
import { defineCommand, inTextChannel } from "../../core/command";
import { embed } from "../../lib/embeds";
import { reply } from "../../lib/reply";

const SENTENCES = [
	"The quick brown fox jumps over the lazy dog near the riverbank",
	"Typing quickly is far easier than typing accurately under pressure",
	"A well written command is worth a thousand lines of clever code",
	"Every bug you fix today is a support ticket you never receive",
	"Consistency in a codebase beats brilliance in any single file",
	"Reading code carefully is the fastest way to write it correctly",
];

/** Zero-width spaces stop a copy-paste from matching the prompt exactly. */
function obfuscate(sentence: string): string {
	return sentence.split("").join("\u200b");
}

export default defineCommand({
	name: "fast-type",
	description: "Race to type a sentence correctly.",
	category: "games",
	guildOnly: true,
	cooldown: 15_000,

	async run(interaction) {
		const channel = inTextChannel(interaction);
		const sentence = SENTENCES[randomInt(SENTENCES.length)]!;

		await reply(interaction, {
			embeds: [
				embed({
					category: "games",
					title: "Fast type",
					description: `Type this sentence exactly. You have 60 seconds.\n\n> ${obfuscate(sentence)}`,
				}),
			],
		});

		const startedAt = Date.now();
		const collected = await channel
			.awaitMessages({
				filter: (message) => message.content.trim().toLowerCase() === sentence.toLowerCase(),
				max: 1,
				time: 60_000,
			})
			.catch(() => null);

		const winner = collected?.first();

		if (!winner) {
			await interaction.followUp({
				embeds: [embed({ category: "games", title: "Time is up", description: "Nobody managed it." })],
			});
			return;
		}

		const seconds = (Date.now() - startedAt) / 1_000;
		const wpm = Math.round((sentence.split(" ").length / seconds) * 60);

		await interaction.followUp({
			embeds: [
				embed({
					category: "games",
					title: "We have a winner",
					description: `${winner.author} finished in **${seconds.toFixed(2)}s** \u2014 about **${wpm} WPM**.`,
				}),
			],
		});
	},
});
