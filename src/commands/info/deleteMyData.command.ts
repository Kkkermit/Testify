import { SECOND_MS } from "@config/constants";
import { defineCommand } from "@core/command";
import { erasePanel } from "@lib/account";
import { errorEmbed, reply, successEmbed } from "@lib/discord";

export default defineCommand({
	name: "delete-my-data",
	description: "Deletes everything the bot keeps about you, in every server. It can't be undone.",
	category: "info",
	aliases: ["deletemydata"],
	private: true,
	cooldown: 10 * SECOND_MS,

	async run(interaction) {
		const panel = erasePanel(interaction.user.id);
		if (interaction.replyBriefly === undefined) {
			await reply(interaction, panel);
			return;
		}

		// A prefix run answers in the channel, where everybody would see it, so the panel goes to their direct messages.
		const sent = await interaction.user.send(panel).then(
			() => true,
			() => false,
		);
		await interaction.replyBriefly(
			sent
				? successEmbed("I've sent you a direct message. Carry on there, where only you can see it.")
				: errorEmbed(
						"Your direct messages are closed, so run `/delete-my-data` instead. Only you will see its answer.",
					),
		);
	},
});
