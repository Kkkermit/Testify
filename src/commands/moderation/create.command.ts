import { ChannelType, PermissionFlagsBits } from "discord.js";
import { LIMITS } from "@config/constants";
import { type CommandInput, type CommandOption, defineCommand, inTextChannel } from "@core/command";
import { UserFacingError } from "@core/errors";
import { readerLanguage } from "@core/language";
import { COLOUR_CHOICES, embed, reply, requirePostable, resolveColour, successEmbed } from "@lib/discord";

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

/** Discord refuses the whole embed over a picture that is not a web address, so it is refused here first. */
function pictureOption(interaction: CommandInput, name: string): string | null {
	const url = interaction.options.getString(name)?.trim() ?? null;
	if (url === null || (URL.canParse(url) && /^https?:$/.test(new URL(url).protocol))) return url;

	throw new UserFacingError(`\`${name}\` has to be a link to a picture, starting with \`https://\`.`);
}

export default defineCommand({
	name: "create",
	description: "Creates embeds and threads.",
	category: "moderation",
	private: true,
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
				{ name: "image", description: "A link to a picture to show under the text.", type: "string" },
				{ name: "thumbnail", description: "A link to a small picture for the corner.", type: "string" },
				{ name: "footer", description: "Footer text.", type: "string", maxLength: LIMITS.embedTitle },
				...FIELD_OPTIONS,
			],
			async run(interaction) {
				const channel = inTextChannel(interaction);
				requirePostable(channel, readerLanguage(interaction), [PermissionFlagsBits.EmbedLinks]);

				const image = pictureOption(interaction, "image");
				const thumbnail = pictureOption(interaction, "thumbnail");
				const footer = interaction.options.getString("footer");

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
					...(image === null ? {} : { image }),
					...(thumbnail === null ? {} : { thumbnail }),
					...(footer === null ? {} : { footer }),
				});

				await channel.send({ embeds: [built] });
				await reply(interaction, { embeds: [successEmbed(`Embed posted in ${channel.toString()}.`)] });
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

				// Announcement channels only take announcement threads.
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
				});
			},
		},
	],
});
