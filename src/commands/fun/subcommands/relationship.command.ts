import { createHash } from "node:crypto";
import { defineCommand } from "@core/command";
import { UserFacingError } from "@core/errors";
import { embed } from "@lib/embeds.util";
import { progressBar } from "@lib/format.util";
import { reply } from "@lib/reply.util";

function compatibility(firstId: string, secondId: string): number {
	const key = [firstId, secondId].sort().join(":");
	const digest = createHash("sha256").update(key).digest();
	return digest[0]! % 101;
}

function verdict(score: number): string {
	if (score >= 90) return "A perfect match. 💞";
	if (score >= 70) return "There is real potential here. 💖";
	if (score >= 50) return "Could work with some effort. 💗";
	if (score >= 30) return "It would be complicated. 💔";
	return "Best left as friends. 🙃";
}

export default defineCommand({
	name: "relationship",
	description: "Checks the compatibility between two people.",
	category: "fun",
	guildOnly: true,
	cooldown: 5_000,
	options: [
		{ name: "first", description: "The first person.", type: "user", required: true },
		{ name: "second", description: "The second person. Defaults to you.", type: "user" },
	],

	async run(interaction) {
		const first = interaction.options.getUser("first", true);
		const second = interaction.options.getUser("second") ?? interaction.user;

		if (first.id === second.id) throw new UserFacingError("Pick two different people.");

		const score = compatibility(first.id, second.id);

		await reply(interaction, {
			embeds: [
				embed({
					category: "fun",
					title: "💘 Compatibility check",
					description: [
						`**${first.displayName}** 💞 **${second.displayName}**`,
						"",
						`${progressBar(score, 100)} **${score}%**`,
						"",
						verdict(score),
					].join("\n"),
					thumbnail: first.displayAvatarURL(),
				}),
			],
		});
	},
});
