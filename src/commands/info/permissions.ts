import { PermissionFlagsBits } from "discord.js";
import { defineCommand } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { embed } from "../../lib/embeds";
import { humanisePermission } from "../../lib/format";
import { reply } from "../../lib/reply";

export default defineCommand({
	name: "permissions",
	description: "Lists the permissions a member has in this server.",
	category: "info",
	guildOnly: true,
	options: [{ name: "user", description: "The member to inspect. Defaults to you.", type: "user" }],

	async run(interaction) {
		const target = interaction.options.getUser("user") ?? interaction.user;
		const member = interaction.guild ? await interaction.guild.members.fetch(target.id).catch(() => null) : null;
		if (!member) throw new UserFacingError("That member is not in this server.");

		const all = Object.keys(PermissionFlagsBits) as (keyof typeof PermissionFlagsBits)[];
		const granted = all.filter((flag) => member.permissions.has(PermissionFlagsBits[flag]));
		const denied = all.filter((flag) => !member.permissions.has(PermissionFlagsBits[flag]));

		const format = (flags: string[]): string =>
			flags.length > 0 ? flags.map((flag) => `\`${humanisePermission(flag)}\``).join(", ") : "None";

		await reply(interaction, {
			embeds: [
				embed({
					category: "info",
					title: `Permissions for ${member.displayName}`,
					fields: [
						{ name: `✅ Granted (${granted.length})`, value: format(granted) },
						{ name: `❌ Denied (${denied.length})`, value: format(denied) },
					],
					thumbnail: target.displayAvatarURL(),
					footer: `${target.username} • ${target.id}`,
				}),
			],
		});
	},
});
