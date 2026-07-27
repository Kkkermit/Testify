import { MessageFlags, PermissionFlagsBits } from "discord.js";
import { strings } from "@config/strings";
import { defineCommand, inTextChannel } from "@core/command";
import { UserFacingError } from "@core/errors";
import { containsProfanity } from "@lib/contentFilter.util";
import { successEmbed } from "@lib/embeds.util";
import { reply } from "@lib/reply.util";

export default defineCommand({
	name: "impersonate",
	description: "Sends a message through a webhook that looks like another member.",
	category: "community",
	guildOnly: true,
	// The original declared `PermissionFlagsBits.createWebhook`, which does not
	// exist, so the gate crashed on `undefined` instead of checking anything.
	permissions: [PermissionFlagsBits.ManageWebhooks],
	botPermissions: [PermissionFlagsBits.ManageWebhooks],
	cooldown: 10_000,
	options: [
		{ name: "user", description: "Who to impersonate.", type: "user", required: true },
		{ name: "message", description: "What they should say.", type: "string", required: true, maxLength: 1_500 },
	],

	async run(interaction) {
		const channel = inTextChannel(interaction);
		if (!("createWebhook" in channel)) throw new UserFacingError("I cannot create a webhook in this channel.");

		const content = interaction.options.getString("message", true);
		if (containsProfanity(content)) throw new UserFacingError(strings.generic.profanity);

		const target = interaction.options.getUser("user", true);
		const member = interaction.guild ? await interaction.guild.members.fetch(target.id).catch(() => null) : null;

		const webhook = await channel.createWebhook({
			name: member?.displayName ?? target.username,
			avatar: target.displayAvatarURL(),
			reason: `Impersonation requested by ${interaction.user.username}`,
		});

		try {
			await webhook.send({ content, allowedMentions: { parse: [] } });
		} finally {
			await webhook.delete(`Impersonation cleanup`).catch(() => null);
		}

		await reply(interaction, { embeds: [successEmbed("Message sent.")], flags: MessageFlags.Ephemeral });
	},
});
