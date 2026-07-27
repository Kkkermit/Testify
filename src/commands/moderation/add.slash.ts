import { PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { embed } from "@lib/embeds.util";
import { reply } from "@lib/reply.util";

const CUSTOM_EMOJI = /^<(a)?:\w+:(\d{15,})>$/;

export default defineCommand({
	name: "add",
	description: "Adds an emoji or sticker to the server.",
	category: "moderation",
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
			async run(interaction) {
				const guild = inGuild(interaction);
				const input = interaction.options.getString("emoji", true).trim();
				const name = interaction.options.getString("name", true).replace(/\W/g, "_");

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
					reason: `Added by ${interaction.user.username}`,
				});

				await reply(interaction, {
					embeds: [
						embed({
							category: "moderation",
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
			async run(interaction) {
				const guild = inGuild(interaction);
				const url = interaction.options.getAttachment("sticker")?.url;
				if (url === undefined) throw new UserFacingError("Attach an image to use as the sticker.");

				const created = await guild.stickers.create({
					file: url,
					name: interaction.options.getString("name", true),
					tags: interaction.options.getString("tags") ?? "⭐",
					reason: `Added by ${interaction.user.username}`,
				});

				await reply(interaction, {
					embeds: [
						embed({
							category: "moderation",
							title: "Sticker added",
							description: `**${created.name}** was added to the server.`,
						}),
					],
				});
			},
		},
	],
});
