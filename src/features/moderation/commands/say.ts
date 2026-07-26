import { PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { strings } from "../../../config/strings";
import { defineCommand } from "../../../core/command";
import { containsProfanity } from "../../../core/contentFilter";
import { UserFacingError } from "../../../core/errors";
import { requireTextChannel } from "../../../core/guards";
import { embed, successEmbed } from "../../../ui/embeds";

export default defineCommand({
	name: "say",
	description: "Sends a message through the bot.",
	category: Category.Moderation,
	surfaces: ["slash"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	botPermissions: [PermissionFlagsBits.SendMessages],
	options: [
		{ name: "message", description: "What to say.", type: "string", required: true, maxLength: 2_000 },
		{ name: "channel", description: "Where to say it. Defaults to this channel.", type: "channel" },
		{ name: "as-embed", description: "Send it inside an embed.", type: "boolean" },
	],

	async execute(ctx) {
		const message = ctx.options.getString("message", true);
		if (containsProfanity(message)) throw new UserFacingError(strings.generic.profanity);

		const target = ctx.options.getChannel("channel") ?? requireTextChannel(ctx);
		if (!target.isTextBased() || !target.isSendable()) {
			throw new UserFacingError("I cannot send messages in that channel.");
		}

		const asEmbed = ctx.options.getBoolean("as-embed") ?? false;

		await target.send(
			asEmbed
				? { embeds: [embed({ category: Category.Moderation, description: message })] }
				: { content: message, allowedMentions: { parse: [] } },
		);

		await ctx.reply({ embeds: [successEmbed(`Message sent in ${target}.`)], ephemeral: true });
	},
});
