import { MessageFlags, PermissionFlagsBits } from "discord.js";
import { LIMITS } from "@config/constants";
import { defineCommand, inTextChannel } from "@core/command";
import { UserFacingError } from "@core/errors";
import { successEmbed } from "@lib/embeds.util";
import { reply } from "@lib/reply.util";

export default defineCommand({
	name: "clear",
	description: "Bulk deletes recent messages in this channel.",
	category: "moderation",
	aliases: ["purge", "prune"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageMessages],
	botPermissions: [PermissionFlagsBits.ManageMessages],
	options: [
		{
			name: "amount",
			description: "How many messages to delete (1-100).",
			type: "integer",
			required: true,
			min: LIMITS.bulkDeleteMin,
			max: LIMITS.bulkDeleteMax,
		},
		{ name: "user", description: "Only delete messages from this user.", type: "user" },
	],

	async run(interaction) {
		const channel = inTextChannel(interaction);
		const amount = interaction.options.getInteger("amount", true);
		const target = interaction.options.getUser("user");

		if (amount < LIMITS.bulkDeleteMin || amount > LIMITS.bulkDeleteMax) {
			throw new UserFacingError(`Pick a number between ${LIMITS.bulkDeleteMin} and ${LIMITS.bulkDeleteMax}.`);
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const fetched = await channel.messages.fetch({ limit: LIMITS.bulkDeleteMax });
		const candidates = [...fetched.values()]
			.filter((message) => (target ? message.author.id === target.id : true))
			.filter((message) => !message.pinned)
			.slice(0, amount);

		if (candidates.length === 0) throw new UserFacingError("There was nothing to delete.");

		// Discord refuses to bulk-delete anything older than 14 days.
		const deleted = await channel.bulkDelete(candidates, true);

		await reply(interaction, {
			embeds: [
				successEmbed(
					`Deleted **${deleted.size}** message(s)${target ? ` from ${target}` : ""}.` +
						(deleted.size < candidates.length ? "\nMessages older than 14 days could not be removed." : ""),
				),
			],
			flags: MessageFlags.Ephemeral,
		});
	},
});
