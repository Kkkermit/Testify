import { PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { getPrefix, setPrefix } from "../../database/repositories/settingsRepository";
import { embed, successEmbed } from "../../lib/embeds";
import { reply } from "../../lib/reply";

const MAX_LENGTH = 5;

export default defineCommand({
	name: "prefix",
	description: "Shows or changes the prefix this server uses for text commands.",
	category: "settings",
	guildOnly: true,

	subcommands: [
		{
			name: "show",
			description: "Shows the current prefix.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const prefix = await getPrefix(guild.id);

				await reply(interaction, {
					embeds: [
						embed({
							category: "settings",
							title: "Prefix",
							description: [
								`This server's prefix is \`${prefix}\`.`,
								"",
								`Try \`${prefix}help\`. Mentioning me works too, and every command is also available with \`/\`.`,
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
				const member = interaction.member;

				const allowed =
					member !== null &&
					"permissions" in member &&
					typeof member.permissions !== "string" &&
					member.permissions.has(PermissionFlagsBits.ManageGuild);

				if (!allowed) throw new UserFacingError("You need Manage Server to change the prefix.");

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
	],
});
