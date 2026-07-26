import { ChannelType, PermissionFlagsBits } from "discord.js";
import { LIMITS } from "../../../config/constants";
import { Category } from "../../../config/categories";
import { defineCommand, type OptionDefinition } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireTextChannel } from "../../../core/guards";
import { embed, successEmbed } from "../../../ui/embeds";
import { COLOR_CHOICES, resolveColor } from "../data/colors";

/**
 * The original declared twelve individual `field-name` / `field-value` string
 * options by hand. Three pairs, generated, covers the same ground without the
 * copy-paste.
 */
const FIELD_OPTIONS: OptionDefinition[] = [1, 2, 3].flatMap((index) => [
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
	category: Category.Moderation,
	surfaces: ["slash"],
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
				{ name: "color", description: "The embed colour.", type: "string", choices: COLOR_CHOICES },
				{ name: "image", description: "An image URL.", type: "string" },
				{ name: "thumbnail", description: "A thumbnail URL.", type: "string" },
				{ name: "footer", description: "Footer text.", type: "string", maxLength: LIMITS.embedTitle },
				...FIELD_OPTIONS,
			],
			async execute(ctx) {
				const channel = requireTextChannel(ctx);

				const fields = [1, 2, 3]
					.map((index) => ({
						name: ctx.options.getString(`field-${index}-name`),
						value: ctx.options.getString(`field-${index}-value`),
					}))
					.filter((field): field is { name: string; value: string } => field.name !== null && field.value !== null);

				const built = embed({
					color: resolveColor(ctx.options.getString("color")),
					title: ctx.options.getString("title", true),
					description: ctx.options.getString("description", true),
					fields,
					...(ctx.options.getString("image") !== null ? { image: ctx.options.getString("image", true) } : {}),
					...(ctx.options.getString("thumbnail") !== null
						? { thumbnail: ctx.options.getString("thumbnail", true) }
						: {}),
					...(ctx.options.getString("footer") !== null ? { footer: ctx.options.getString("footer", true) } : {}),
				});

				await channel.send({ embeds: [built] });
				await ctx.reply({ embeds: [successEmbed("Embed posted.")], ephemeral: true });
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
			async execute(ctx) {
				const channel = requireTextChannel(ctx);
				if (!("threads" in channel)) throw new UserFacingError("Threads cannot be created in this channel.");

				const isPrivate = ctx.options.getBoolean("private") ?? false;
				const name = ctx.options.getString("name") ?? `Thread by ${ctx.user.username}`;
				const reason = `Created by ${ctx.user.username}`;

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

				await ctx.reply({ embeds: [successEmbed(`Thread created: ${thread}.`)], ephemeral: true });
			},
		},
	],

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand: `embed` or `thread`.", ephemeral: true });
	},
});
