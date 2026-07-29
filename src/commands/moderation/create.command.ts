import { ChannelType, MessageFlags, PermissionFlagsBits } from "discord.js";
import { LIMITS } from "@config/constants";
import { defineCommand, inTextChannel, type CommandOption } from "@core/command";
import { UserFacingError } from "@core/errors";
import { COLOUR_CHOICES, resolveColour } from "@lib/colours.util";
import { embed, successEmbed } from "@lib/embeds.util";
import { reply } from "@lib/reply.util";

/**
 * The original declared twelve individual `field-name` / `field-value` string
 * options by hand. Three pairs, generated, covers the same ground without the
 * copy-paste.
 */
const FIELD_OPTIONS: CommandOption[] = [1, 2, 3].flatMap((index) => [
	{
		name: `field-${index}-name`,
		description: `Name of field ${index}.`,
		type: "string" as const,
		maxLength: LIMITS.embedTitle,
	},
	{
		name: `field-${index}-value`,
		description: `Value of field ${index}.`,
		type: "string" as const,
		maxLength: LIMITS.embedFieldValue,
	},
]);

export default defineCommand({
	name: "create",
	description: "Creates embeds and threads.",
	category: "moderation",
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageMessages],
	subcommands: [
		{
			name: "embed",
			description: "Build and post a custom embed.",
			options: [
				{
					name: "title",
					description: "The embed title.",
					type: "string",
					required: true,
					maxLength: LIMITS.embedTitle,
				},
				{
					name: "description",
					description: "The embed body.",
					type: "string",
					required: true,
					maxLength: LIMITS.embedDescription,
				},
				{ name: "color", description: "The embed colour.", type: "string", choices: COLOUR_CHOICES },
				{ name: "image", description: "An image URL.", type: "string" },
				{ name: "thumbnail", description: "A thumbnail URL.", type: "string" },
				{ name: "footer", description: "Footer text.", type: "string", maxLength: LIMITS.embedTitle },
				...FIELD_OPTIONS,
			],
			async run(interaction) {
				const channel = inTextChannel(interaction);

				const fields = [1, 2, 3]
					.map((index) => ({
						name: interaction.options.getString(`field-${index}-name`),
						value: interaction.options.getString(`field-${index}-value`),
					}))
					.filter((field): field is { name: string; value: string } => field.name !== null && field.value !== null);

				const built = embed({
					colour: resolveColour(interaction.options.getString("color")),
					title: interaction.options.getString("title", true),
					description: interaction.options.getString("description", true),
					fields,
					...(interaction.options.getString("image") !== null
						? { image: interaction.options.getString("image", true) }
						: {}),
					...(interaction.options.getString("thumbnail") !== null
						? { thumbnail: interaction.options.getString("thumbnail", true) }
						: {}),
					...(interaction.options.getString("footer") !== null
						? { footer: interaction.options.getString("footer", true) }
						: {}),
				});

				await channel.send({ embeds: [built] });
				await reply(interaction, { embeds: [successEmbed("Embed posted.")], flags: MessageFlags.Ephemeral });
			},
		},
		{
			name: "thread",
			description: "Open a thread in this channel.",
			options: [
				{ name: "name", description: "The thread name.", type: "string", maxLength: 100 },
				{
					name: "private",
					description: "Create a private thread instead of a public one.",
					type: "boolean",
				},
			],
			async run(interaction) {
				const channel = inTextChannel(interaction);
				if (!("threads" in channel)) throw new UserFacingError("Threads cannot be created in this channel.");

				const isPrivate = interaction.options.getBoolean("private") ?? false;
				const name = interaction.options.getString("name") ?? `Thread by ${interaction.user.username}`;
				const reason = `Created by ${interaction.user.username}`;

				// Announcement channels only accept announcement threads, so the type is
				// only narrowed for the channels that actually support the choice.
				const thread =
					channel.type === ChannelType.GuildAnnouncement
						? await channel.threads.create({ name, reason })
						: await channel.threads.create({
								name,
								reason,
								type: isPrivate ? ChannelType.PrivateThread : ChannelType.PublicThread,
							});

				await reply(interaction, {
					embeds: [successEmbed(`Thread created: ${thread}.`)],
					flags: MessageFlags.Ephemeral,
				});
			},
		},
	],
});
