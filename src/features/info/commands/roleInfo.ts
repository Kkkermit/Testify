import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { embed } from "../../../ui/embeds";
import { discordTime, formatNumber, humanisePermission, truncate } from "../../../ui/format";

export default defineCommand({
	name: "role-info",
	description: "Shows information about a role.",
	category: Category.Info,
	surfaces: ["slash", "prefix"],
	aliases: ["roleinfo"],
	guildOnly: true,
	options: [{ name: "role", description: "The role to look up.", type: "role", required: true }],

	async execute(ctx) {
		const role = ctx.options.getRole("role");
		if (!role) throw new UserFacingError("I could not find that role in this server.");
		if (role.name === "@everyone") throw new UserFacingError("The `@everyone` role has no useful information.");

		const permissions = role.permissions.toArray();

		await ctx.reply({
			embeds: [
				embed({
					color: role.color === 0 ? undefined : role.hexColor,
					category: Category.Info,
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
