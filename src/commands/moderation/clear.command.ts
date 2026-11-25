import { PermissionFlagsBits } from "discord.js";
import { LIMITS } from "@config/constants";
import { defineCommand, inTextChannel } from "@core/command";
import { UserFacingError } from "@core/errors";
import { reply, successEmbed } from "@lib/discord";
import { formatNumber } from "@lib/format";

export default defineCommand({
	name: "clear",
	description: "Bulk deletes recent messages in this channel.",
	category: "moderation",
	private: true,
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

		await interaction.deferReply();

		const fetched = await channel.messages.fetch({ limit: LIMITS.bulkDeleteMax });
		const candidates = [...fetched.values()]
			.filter((message) => (target ? message.author.id === target.id : true))
			.filter((message) => !message.pinned)
			.slice(0, amount);

		if (candidates.length === 0) throw new UserFacingError("There was nothing to delete.");

		// Discord refuses to bulk-delete anything older than 14 days.
		const deleted = await channel.bulkDelete(candidates, true);

		const skipped = candidates.length - deleted.size;
		await reply(interaction, {
			embeds: [
				successEmbed(
					`Deleted **${formatNumber(deleted.size)}** ${deleted.size === 1 ? "message" : "messages"}${target ? ` from ${target.toString()}` : ""}.` +
						(skipped > 0
							? `\n-# ${formatNumber(skipped)} older than 14 days were left, since Discord will not bulk-delete those.`
							: ""),
				),
			],
		});
	},
});
