import { PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { embed } from "../../../ui/embeds";

const CUSTOM_EMOJI = /^<(a)?:\w+:(\d{15,})>$/;

export default defineCommand({
	name: "add",
	description: "Adds an emoji or sticker to the server.",
	category: Category.Moderation,
	surfaces: ["slash"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuildExpressions],
	botPermissions: [PermissionFlagsBits.ManageGuildExpressions],
	subcommands: [
		{
			name: "emoji",
			description: "Steal an emoji into this server.",
			options: [
				{ name: "emoji", description: "The custom emoji or an image URL.", type: "string", required: true },
				{ name: "name", description: "The name for the new emoji.", type: "string", required: true, maxLength: 32 },
			],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const input = ctx.options.getString("emoji", true).trim();
				const name = ctx.options.getString("name", true).replace(/\W/g, "_");

				const match = CUSTOM_EMOJI.exec(input);
				const url = match
					? `https://cdn.discordapp.com/emojis/${match[2]}.${match[1] === "a" ? "gif" : "png"}?quality=lossless`
					: input;

				if (!url.startsWith("https://")) {
					throw new UserFacingError(
						"Provide a custom emoji or an `https://` image URL. Default emoji cannot be added.",
					);
				}

				const created = await guild.emojis.create({
					attachment: url,
					name,
					reason: `Added by ${ctx.user.username}`,
				});

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Moderation,
							title: "Emoji added",
							description: `${created} was added as \`:${created.name}:\`.`,
							thumbnail: created.imageURL(),
						}),
					],
				});
			},
		},
		{
			name: "sticker",
			description: "Add a sticker to this server.",
			options: [
				{ name: "sticker", description: "The image to upload.", type: "attachment", required: true },
				{ name: "name", description: "The name for the sticker.", type: "string", required: true, maxLength: 30 },
				{ name: "tags", description: "The related emoji, used as the sticker's tag.", type: "string" },
			],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const url = ctx.options.getAttachmentUrl("sticker");
				if (url === null) throw new UserFacingError("Attach an image to use as the sticker.");

				const created = await guild.stickers.create({
					file: url,
					name: ctx.options.getString("name", true),
					tags: ctx.options.getString("tags") ?? "⭐",
					reason: `Added by ${ctx.user.username}`,
				});

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Moderation,
							title: "Sticker added",
							description: `**${created.name}** was added to the server.`,
						}),
					],
				});
			},
		},
	],

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand: `emoji` or `sticker`.", ephemeral: true });
	},
});
