import { MessageFlags } from "discord.js";
import { defineCommand } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { embed, successEmbed } from "../../lib/embeds";
import { reply } from "../../lib/reply";

export default defineCommand({
	name: "dm",
	description: "Sends a direct message through the bot.",
	category: "owner",
	ownerOnly: true,
	options: [
		{ name: "user", description: "Who to message.", type: "user", required: true },
		{ name: "message", description: "What to say.", type: "string", required: true, maxLength: 1_800 },
	],

	async run(interaction, client) {
		const target = interaction.options.getUser("user", true);
		const content = interaction.options.getString("message", true);

		try {
			await target.send({
				embeds: [
					embed({
						category: "owner",
						title: `A message from ${client.user?.username ?? "the bot"}`,
						description: content,
						footer: `Sent by ${interaction.user.username}`,
					}),
				],
			});
		} catch {
			throw new UserFacingError("I could not send them a direct message. Their DMs are probably closed.");
		}

		await reply(interaction, {
			embeds: [successEmbed(`Message delivered to ${target}.`)],
			flags: MessageFlags.Ephemeral,
		});
	},
});
