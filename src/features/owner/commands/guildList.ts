import { Category } from "../../../config/categories";
import { type TestifyClient } from "../../../core/client";
import { defineCommand } from "../../../core/command";
import { Namespace } from "../../../core/customId";
import { embed } from "../../../ui/embeds";
import { discordTime, formatNumber } from "../../../ui/format";
import { buildPage } from "../../../ui/pagination";

export const GUILD_PAGE_SIZE = 10;

export interface GuildSummary {
	id: string;
	name: string;
	memberCount: number;
	joinedAt: number;
}

export function guildSummaries(client: TestifyClient): GuildSummary[] {
	return [...client.guilds.cache.values()]
		.map((guild) => ({
			id: guild.id,
			name: guild.name,
			memberCount: guild.memberCount,
			joinedAt: guild.joinedTimestamp,
		}))
		.sort((a, b) => b.memberCount - a.memberCount);
}

export function renderGuildPage(items: GuildSummary[]) {
	return embed({
		category: Category.Owner,
		title: "Servers",
		description:
			items
				.map(
					(guild) =>
						`**${guild.name}** (\`${guild.id}\`)\n> ${formatNumber(guild.memberCount)} members \u00b7 joined ${discordTime(guild.joinedAt, "R")}`,
				)
				.join("\n\n") || "The bot is not in any servers.",
	});
}

/**
 * The previous version declared `permissions: [PermissionsBitField.Administrator]`,
 * a property that does not exist, so the array was `[undefined]` and the gate threw.
 * Ownership is now a first-class command flag.
 */
export default defineCommand({
	name: "guild-list",
	description: "Lists every server the bot is in.",
	category: Category.Owner,
	surfaces: ["slash"],
	ownerOnly: true,

	async execute(ctx) {
		const page = buildPage(
			{
				items: guildSummaries(ctx.client),
				pageSize: GUILD_PAGE_SIZE,
				namespace: Namespace.GuildList,
				ownerId: ctx.user.id,
				render: renderGuildPage,
			},
			0,
		);

		await ctx.reply({ ...page, ephemeral: true });
	},
});
