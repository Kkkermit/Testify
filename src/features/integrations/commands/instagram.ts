import { ChannelType, PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import {
	addInstagramWatch,
	getInstagramWatch,
	removeInstagramWatch,
} from "../../../database/repositories/integrationRepository";
import { fetchLatestPosts, postUrl } from "../../../integrations/instagram";
import { embed, successEmbed } from "../../../ui/embeds";
import { discordTime, truncate } from "../../../ui/format";

const USERNAME_PATTERN = /^[a-z0-9._]{1,30}$/i;

export default defineCommand({
	name: "instagram",
	description: "Watches Instagram accounts and posts their updates.",
	category: Category.Integrations,
	surfaces: ["slash"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	cooldownMs: 5_000,
	subcommands: [
		{
			name: "watch",
			description: "Start watching an account.",
			options: [
				{ name: "username", description: "The Instagram username, without the @.", type: "string", required: true },
				{
					name: "channel",
					description: "Where updates are posted.",
					type: "channel",
					required: true,
					channelTypes: [ChannelType.GuildText],
				},
			],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const username = ctx.options.getString("username", true).trim().replace(/^@/, "").toLowerCase();
				if (!USERNAME_PATTERN.test(username)) throw new UserFacingError("That is not a valid Instagram username.");

				const channel = ctx.options.getChannel("channel");
				if (!channel?.isTextBased() || !channel.isSendable()) throw new UserFacingError("Pick a text channel.");

				await addInstagramWatch(guild.id, channel.id, username);
				await ctx.reply({ embeds: [successEmbed(`Now watching **@${username}**. Updates go to ${channel}.`)] });
			},
		},
		{
			name: "unwatch",
			description: "Stop watching an account.",
			options: [{ name: "username", description: "The Instagram username.", type: "string", required: true }],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const username = ctx.options.getString("username", true).trim().replace(/^@/, "").toLowerCase();

				const updated = await removeInstagramWatch(guild.id, username);
				if (!updated) throw new UserFacingError("Nothing is being watched in this server.");

				await ctx.reply({ embeds: [successEmbed(`No longer watching **@${username}**.`)] });
			},
		},
		{
			name: "list",
			description: "Show the watched accounts.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const watch = await getInstagramWatch(guild.id);

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Integrations,
							title: "Watched Instagram accounts",
							description:
								watch && watch.usernames.length > 0
									? watch.usernames.map((name) => `\u2022 @${name}`).join("\n")
									: "No accounts are being watched.",
							...(watch ? { fields: [{ name: "Channel", value: `<#${watch.channelId}>` }] } : {}),
						}),
					],
				});
			},
		},
		{
			name: "latest",
			description: "Fetch the latest post from an account.",
			options: [{ name: "username", description: "The Instagram username.", type: "string", required: true }],
			async execute(ctx) {
				await ctx.defer();

				const username = ctx.options.getString("username", true).trim().replace(/^@/, "").toLowerCase();
				const [post] = await fetchLatestPosts(username, 1);
				if (!post) throw new UserFacingError(`**@${username}** has no visible posts.`);

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Integrations,
							title: `Latest post from @${username}`,
							url: postUrl(post),
							description: truncate(post.caption, 800),
							image: post.imageUrl,
							fields: [{ name: "Posted", value: discordTime(post.takenAt, "R") }],
						}),
					],
				});
			},
		},
	],

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand: `watch`, `unwatch`, `list` or `latest`.", ephemeral: true });
	},
});
