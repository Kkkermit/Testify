import { createHash } from "node:crypto";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { embed } from "../../../ui/embeds";
import { progressBar } from "../../../ui/format";

/**
 * Deterministic per-pair so the same two people always get the same answer —
 * the previous version re-rolled on every invocation, which made the "checker"
 * meaningless.
 */
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
	category: Category.Fun,
	surfaces: ["slash", "prefix"],
	aliases: ["ship", "love"],
	guildOnly: true,
	cooldownMs: 5_000,
	options: [
		{ name: "first", description: "The first person.", type: "user", required: true },
		{ name: "second", description: "The second person. Defaults to you.", type: "user" },
	],

	async execute(ctx) {
		const first = ctx.options.getUser("first", true);
		const second = ctx.options.getUser("second") ?? ctx.user;

		if (first.id === second.id) throw new UserFacingError("Pick two different people.");

		const score = compatibility(first.id, second.id);

		await ctx.reply({
			embeds: [
				embed({
					category: Category.Fun,
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
