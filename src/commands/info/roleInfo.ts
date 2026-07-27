import { defineCommand, roleOption } from "@core/command";
import { UserFacingError } from "@core/errors";
import { embed } from "@lib/embeds";
import { discordTime, formatNumber, humanisePermission, truncate } from "@lib/format";
import { reply } from "@lib/reply";

export default defineCommand({
	name: "role-info",
	description: "Shows information about a role.",
	category: "info",
	guildOnly: true,
	options: [{ name: "role", description: "The role to look up.", type: "role", required: true }],

	async run(interaction) {
		const role = roleOption(interaction, "role");
		if (!role) throw new UserFacingError("I could not find that role in this server.");
		if (role.name === "@everyone") throw new UserFacingError("The `@everyone` role has no useful information.");

		const permissions = role.permissions.toArray();

		await reply(interaction, {
			embeds: [
				embed({
					colour: role.color === 0 ? undefined : role.hexColor,
					category: "info",
					title: `Role: ${role.name}`,
					fields: [
						{ name: "Colour", value: role.hexColor, inline: true },
						{ name: "Position", value: String(role.position), inline: true },
						{ name: "Members", value: formatNumber(role.members.size), inline: true },
						{ name: "Mentionable", value: role.mentionable ? "Yes" : "No", inline: true },
						{ name: "Hoisted", value: role.hoist ? "Yes" : "No", inline: true },
						{ name: "Managed", value: role.managed ? "Yes" : "No", inline: true },
						{ name: "Created", value: discordTime(role.createdAt, "R") },
						{
							name: `Permissions (${permissions.length})`,
							value: truncate(permissions.map(humanisePermission).join(", ") || "None", 1_000),
						},
					],
					footer: `Role ID: ${role.id}`,
				}),
			],
		});
	},
});
