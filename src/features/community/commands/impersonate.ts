import { PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { strings } from "../../../config/strings";
import { defineCommand } from "../../../core/command";
import { containsProfanity } from "../../../core/contentFilter";
import { UserFacingError } from "../../../core/errors";
import { requireTextChannel } from "../../../core/guards";
import { successEmbed } from "../../../ui/embeds";

export default defineCommand({
	name: "impersonate",
	description: "Sends a message through a webhook that looks like another member.",
	category: Category.Community,
	surfaces: ["slash"],
	guildOnly: true,
	// The original declared `PermissionFlagsBits.createWebhook`, which does not
	// exist, so the gate crashed on `undefined` instead of checking anything.
	permissions: [PermissionFlagsBits.ManageWebhooks],
	botPermissions: [PermissionFlagsBits.ManageWebhooks],
	cooldownMs: 10_000,
	options: [
		{ name: "user", description: "Who to impersonate.", type: "user", required: true },
		{ name: "message", description: "What they should say.", type: "string", required: true, maxLength: 1_500 },
	],

	async execute(ctx) {
		const channel = requireTextChannel(ctx);
		if (!("createWebhook" in channel)) throw new UserFacingError("I cannot create a webhook in this channel.");

		const content = ctx.options.getString("message", true);
		if (containsProfanity(content)) throw new UserFacingError(strings.generic.profanity);

		const target = ctx.options.getUser("user", true);
		const member = ctx.guild ? await ctx.guild.members.fetch(target.id).catch(() => null) : null;

		const webhook = await channel.createWebhook({
			name: member?.displayName ?? target.username,
			avatar: target.displayAvatarURL(),
			reason: `Impersonation requested by ${ctx.user.username}`,
		});

		try {
			await webhook.send({ content, allowedMentions: { parse: [] } });
		} finally {
			await webhook.delete(`Impersonation cleanup`).catch(() => null);
		}

		await ctx.reply({ embeds: [successEmbed("Message sent.")], ephemeral: true });
	},
});
