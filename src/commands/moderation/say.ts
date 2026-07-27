import { MessageFlags, PermissionFlagsBits } from "discord.js";
import { strings } from "@config/strings";
import { defineCommand, inTextChannel, textChannelOption } from "@core/command";
import { UserFacingError } from "@core/errors";
import { containsProfanity } from "@lib/contentFilter";
import { embed, successEmbed } from "@lib/embeds";
import { reply } from "@lib/reply";

export default defineCommand({
	name: "say",
	description: "Sends a message through the bot.",
	category: "moderation",
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	botPermissions: [PermissionFlagsBits.SendMessages],
	options: [
		{ name: "message", description: "What to say.", type: "string", required: true, maxLength: 2_000 },
		{ name: "channel", description: "Where to say it. Defaults to this channel.", type: "channel" },
		{ name: "as-embed", description: "Send it inside an embed.", type: "boolean" },
	],

	async run(interaction) {
		const message = interaction.options.getString("message", true);
		if (containsProfanity(message)) throw new UserFacingError(strings.generic.profanity);

		const target = textChannelOption(interaction, "channel") ?? inTextChannel(interaction);
		if (!target.isTextBased() || !target.isSendable()) {
			throw new UserFacingError("I cannot send messages in that channel.");
		}

		const asEmbed = interaction.options.getBoolean("as-embed") ?? false;

		await target.send(
			asEmbed
				? { embeds: [embed({ category: "moderation", description: message })] }
				: { content: message, allowedMentions: { parse: [] } },
		);

		await reply(interaction, { embeds: [successEmbed(`Message sent in ${target}.`)], flags: MessageFlags.Ephemeral });
	},
});
