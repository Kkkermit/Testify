import { MessageFlags } from "discord.js";
import { defineCommand, inTextChannel } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { successEmbed } from "../../lib/embeds";
import { reply } from "../../lib/reply";

const MAX_FLUSH = 100;

export default defineCommand({
	name: "flush-logs",
	description: "Deletes the bot's own recent messages in this channel.",
	category: "owner",
	guildOnly: true,
	ownerOnly: true,
	options: [{ name: "amount", description: "How many to scan (1-100).", type: "integer", min: 1, max: MAX_FLUSH }],

	async run(interaction, client) {
		const channel = inTextChannel(interaction);
		const limit = interaction.options.getInteger("amount") ?? MAX_FLUSH;

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const fetched = await channel.messages.fetch({ limit: MAX_FLUSH });
		const mine = [...fetched.values()].filter((message) => message.author.id === client.user?.id).slice(0, limit);

		if (mine.length === 0) throw new UserFacingError("I have no recent messages to remove here.");

		const deleted = await channel.bulkDelete(mine, true);
		await reply(interaction, {
			embeds: [successEmbed(`Removed **${deleted.size}** of my messages.`)],
			flags: MessageFlags.Ephemeral,
		});
	},
});
