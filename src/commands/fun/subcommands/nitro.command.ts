import { randomInt } from "node:crypto";
import { defineCommand } from "@core/command";
import { embed } from "@lib/embeds.util";
import { reply } from "@lib/reply.util";

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function fakeCode(length = 16): string {
	let code = "";
	for (let index = 0; index < length; index += 1) code += ALPHABET[randomInt(ALPHABET.length)];
	return code;
}

export default defineCommand({
	name: "nitro",
	description: "Generates a fake Nitro gift link.",
	category: "fun",
	cooldown: 10_000,

	async run(interaction) {
		await reply(interaction, {
			embeds: [
				embed({
					category: "fun",
					title: "A wild gift appeared",
					description: `\`\`\`\nhttps://discord.gift/${fakeCode()}\n\`\`\`\nIt is not a real gift — nobody is getting Nitro today.`,
				}),
			],
		});
	},
});
