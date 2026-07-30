import { MessageFlags, PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { getWelcome, saveWelcome } from "@database/repositories/settingsRepository";
import { successEmbed } from "@lib/embeds.util";
import { reply } from "@lib/reply.util";
import { checkBackground, normaliseWelcome } from "@lib/welcome.util";
import { greetingFor } from "@lib/welcomeActions.util";
import { welcomePanel } from "@lib/welcomePanel.util";

/**
 * One panel, plus the two things a panel cannot do: take a file upload, and post a
 * real greeting.
 *
 * The old `set <channel> <message> <embed>` asked people to write the greeting
 * blind in a slash-command box, with the placeholders documented only in an option
 * description nobody reads twice.
 */
export default defineCommand({
	name: "welcome",
	description: "Greets new members when they join.",
	category: "settings",
	aliases: ["welcome-system", "greet"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	botPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
	subcommands: [
		{
			name: "setup",
			description: "Open the welcome panel.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const config = normaliseWelcome(await getWelcome(guild.id));

				await reply(interaction, welcomePanel({ config }, interaction.user.id));
			},
		},
		{
			name: "background",
			description: "Upload a background image for the welcome card.",
			options: [
				{
					name: "image",
					description: "A PNG or JPG, ideally 1024x400.",
					type: "attachment",
					required: true,
				},
			],
			async run(interaction) {
				const guild = inGuild(interaction);
				const config = normaliseWelcome(await getWelcome(guild.id));
				if (config === null) throw new UserFacingError("Set the welcome system up first with `/welcome setup`.");

				const file = interaction.options.getAttachment("image", true);

				// Checked before downloading, so a huge upload never reaches memory.
				const verdict = checkBackground(file);
				if (!verdict.ok) throw new UserFacingError(verdict.reason ?? "That image cannot be used.");

				await interaction.deferReply();

				const response = await fetch(file.url).catch(() => null);
				if (!response?.ok) throw new UserFacingError("I could not download that image. Try uploading it again.");

				// Stored as bytes rather than as a link: Discord's attachment URLs are
				// signed and expire within hours, so a stored URL would break by tomorrow.
				await saveWelcome(guild.id, {
					background: {
						data: Buffer.from(await response.arrayBuffer()),
						contentType: file.contentType ?? "image/png",
						name: file.name,
					},
					style: "card",
				});

				await reply(interaction, {
					embeds: [successEmbed("Background saved, and the greeting is now an image card. Try `/welcome test`.")],
				});
			},
		},
		{
			name: "test",
			description: "Send yourself the greeting a new member would get.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const settings = await getWelcome(guild.id);
				const config = normaliseWelcome(settings);
				if (config === null) throw new UserFacingError("The welcome system is not set up. Try `/welcome setup`.");

				await interaction.deferReply({ flags: MessageFlags.Ephemeral });

				const member = await guild.members.fetch(interaction.user.id).catch(() => null);
				if (member === null) throw new UserFacingError("I could not read your member profile.");

				// The same builder the join event uses, so the test cannot flatter it.
				await reply(interaction, await greetingFor(member, config, settings));
			},
		},
	],

	async run(interaction) {
		const guild = inGuild(interaction);
		const config = normaliseWelcome(await getWelcome(guild.id));

		await reply(interaction, welcomePanel({ config }, interaction.user.id));
	},
});
