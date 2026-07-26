import { randomInt } from "node:crypto";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { embed } from "../../../ui/embeds";

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function fakeCode(length = 16): string {
	let code = "";
	for (let index = 0; index < length; index += 1) code += ALPHABET[randomInt(ALPHABET.length)];
	return code;
}

export default defineCommand({
	name: "nitro",
	description: "Generates a fake Nitro gift link.",
	category: Category.Fun,
	surfaces: ["slash", "prefix"],
	cooldownMs: 10_000,

	async execute(ctx) {
		await ctx.reply({
			embeds: [
				embed({
					category: Category.Fun,
					title: "A wild gift appeared",
					description: `\`\`\`\nhttps://discord.gift/${fakeCode()}\n\`\`\`\nIt is not a real gift — nobody is getting Nitro today.`,
				}),
			],
		});
	},
});
