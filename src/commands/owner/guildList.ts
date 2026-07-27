import { MessageFlags } from "discord.js";
import { type TestifyClient } from "@core/client";
import { defineCommand } from "@core/command";
import { embed } from "@lib/embeds";
import { discordTime, formatNumber } from "@lib/format";
import { buildPage } from "@lib/pagination";
import { reply } from "@lib/reply";

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
		category: "owner",
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
	category: "owner",
	ownerOnly: true,

	async run(interaction, client) {
		const page = buildPage(
			{
				items: guildSummaries(client),
				pageSize: GUILD_PAGE_SIZE,
				id: "guilds",
				ownerId: interaction.user.id,
				render: renderGuildPage,
			},
			0,
		);

		await reply(interaction, { ...page, flags: MessageFlags.Ephemeral });
	},
});
