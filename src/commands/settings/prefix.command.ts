import { PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { getPrefixConfig, setPrefix, setPrefixEnabled } from "@database/repositories/settingsRepository";
import { embed, successEmbed } from "@lib/embeds.util";
import { reply } from "@lib/reply.util";

const MAX_LENGTH = 5;

/** Changing any of this needs Manage Server; anyone may look. */
function requireManager(interaction: Parameters<typeof inGuild>[0]): void {
	const member = interaction.member;
	const allowed =
		member !== null &&
		"permissions" in member &&
		typeof member.permissions !== "string" &&
		member.permissions.has(PermissionFlagsBits.ManageGuild);

	if (!allowed) throw new UserFacingError("You need Manage Server to change this.");
}

export default defineCommand({
	name: "prefix",
	description: "Shows or changes the prefix this server uses for text commands.",
	category: "settings",
	guildOnly: true,

	subcommands: [
		{
			name: "show",
			description: "Shows the current prefix and whether text commands are on.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const { prefix, isEnabled } = await getPrefixConfig(guild.id);

				await reply(interaction, {
					embeds: [
						embed({
							category: "settings",
							title: "Prefix",
							description: isEnabled
								? [
										`This server's prefix is \`${prefix}\`.`,
										"",
										`Try \`${prefix}help\`. Mentioning me works too, and every command is also available with \`/\`.`,
									].join("\n")
								: [
										"Text commands are switched **off** in this server.",
										"",
										`Turn them on with \`/prefix enable\`. Slash commands work either way.`,
									].join("\n"),
						}),
					],
				});
			},
		},
		{
			name: "set",
			description: "Changes the prefix. Needs Manage Server.",
			options: [{ name: "prefix", description: "The new prefix, e.g. `!`", type: "string", required: true }],

			async run(interaction) {
				const guild = inGuild(interaction);
				requireManager(interaction);

				const wanted = interaction.options.getString("prefix", true).trim();

				if (wanted.length === 0 || wanted.length > MAX_LENGTH) {
					throw new UserFacingError(`A prefix has to be between 1 and ${MAX_LENGTH} characters.`);
				}
				if (/\s/.test(wanted)) throw new UserFacingError("A prefix cannot contain spaces.");

				await setPrefix(guild.id, wanted);

				await reply(interaction, {
					embeds: [successEmbed(`The prefix is now \`${wanted}\`. Try \`${wanted}help\`.`)],
				});
			},
		},
		{
			name: "enable",
			description: "Lets members use text commands here. Needs Manage Server.",
			async run(interaction) {
				const guild = inGuild(interaction);
				requireManager(interaction);

				const { prefix } = await setPrefixEnabled(guild.id, true);

				await reply(interaction, {
					embeds: [successEmbed(`Text commands are on. Try \`${prefix}help\`.`)],
				});
			},
		},
		{
			name: "disable",
			description: "Turns text commands off, leaving slash commands. Needs Manage Server.",
			async run(interaction) {
				const guild = inGuild(interaction);
				requireManager(interaction);

				await setPrefixEnabled(guild.id, false);

				await reply(interaction, {
					embeds: [successEmbed("Text commands are off. Slash commands still work.")],
				});
			},
		},
	],
});
