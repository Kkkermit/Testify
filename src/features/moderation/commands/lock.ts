import { ChannelType, PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild, requireTextChannel } from "../../../core/guards";
import { embed } from "../../../ui/embeds";
import { DEFAULT_REASON } from "../services/moderationActions";

export default defineCommand({
	name: "lock",
	description: "Stops everyone from sending messages in a channel.",
	category: Category.Moderation,
	surfaces: ["slash", "prefix"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageChannels],
	botPermissions: [PermissionFlagsBits.ManageRoles],
	options: [
		{
			name: "channel",
			description: "The channel to lock. Defaults to this one.",
			type: "channel",
			channelTypes: [ChannelType.GuildText],
		},
		{ name: "reason", description: "Why the channel is being locked.", type: "string", greedy: true },
	],

	async execute(ctx) {
		const guild = requireGuild(ctx);
		const channel = ctx.options.getChannel("channel") ?? requireTextChannel(ctx);
		const reason = ctx.options.getString("reason") ?? DEFAULT_REASON;

		if (!("permissionOverwrites" in channel)) throw new UserFacingError("That channel cannot be locked.");

		await channel.permissionOverwrites.edit(
			guild.roles.everyone,
			{ SendMessages: false },
			{ reason: `${ctx.user.username}: ${reason}` },
		);

		await ctx.reply({
			embeds: [
				embed({
					category: Category.Moderation,
					title: "🔒 Channel locked",
					description: `${channel} has been locked.`,
					fields: [{ name: "Reason", value: reason }],
				}),
			],
		});
	},
});
