import { PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { strings } from "../../../config/strings";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild, requireMember } from "../../../core/guards";
import { type CommandContext } from "../../../core/context";
import { successEmbed } from "../../../ui/embeds";

/**
 * `addRole` and `removeRole` were separate prefix commands and a separate slash
 * command with two subcommands. All three are this one implementation.
 */
export default defineCommand({
	name: "role",
	description: "Adds or removes a role from a member.",
	category: Category.Moderation,
	surfaces: ["slash", "prefix"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageRoles],
	botPermissions: [PermissionFlagsBits.ManageRoles],
	subcommands: [
		{
			name: "add",
			description: "Gives a role to a member.",
			options: [
				{ name: "user", description: "The member.", type: "user", required: true },
				{ name: "role", description: "The role to add.", type: "role", required: true },
			],
			execute: (ctx) => apply(ctx, "add"),
		},
		{
			name: "remove",
			description: "Takes a role away from a member.",
			options: [
				{ name: "user", description: "The member.", type: "user", required: true },
				{ name: "role", description: "The role to remove.", type: "role", required: true },
			],
			execute: (ctx) => apply(ctx, "remove"),
		},
	],

	async execute(ctx) {
		await apply(ctx, ctx.options.getSubcommand() === "remove" ? "remove" : "add");
	},
});

async function apply(ctx: CommandContext, mode: "add" | "remove"): Promise<void> {
	const guild = requireGuild(ctx);
	const moderator = requireMember(ctx);
	const target = ctx.options.getUser("user", true);
	const role = ctx.options.getRole("role");

	if (!role) throw new UserFacingError("I could not find that role.");
	if (role.managed) throw new UserFacingError("That role is managed by an integration and cannot be assigned.");

	if (moderator.id !== guild.ownerId && role.position >= moderator.roles.highest.position) {
		throw new UserFacingError("That role is equal to or higher than your own.");
	}

	const me = guild.members.me;
	if (me && role.position >= me.roles.highest.position) {
		throw new UserFacingError("That role is higher than mine, so I cannot assign it.");
	}

	const member = await guild.members.fetch(target.id).catch(() => null);
	if (!member) throw new UserFacingError(strings.moderation.memberNotFound);

	const hasRole = member.roles.cache.has(role.id);
	if (mode === "add" && hasRole) throw new UserFacingError(`${target} already has ${role}.`);
	if (mode === "remove" && !hasRole) throw new UserFacingError(`${target} does not have ${role}.`);

	if (mode === "add") await member.roles.add(role, `Added by ${ctx.user.username}`);
	else await member.roles.remove(role, `Removed by ${ctx.user.username}`);

	await ctx.reply({
		embeds: [successEmbed(mode === "add" ? `Added ${role} to ${target}.` : `Removed ${role} from ${target}.`)],
	});
}
