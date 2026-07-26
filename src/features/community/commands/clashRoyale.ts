import { z } from "zod";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { ConfigurationError, NotFoundError } from "../../../core/errors";
import { fetchJson } from "../../../integrations/http";
import { embed } from "../../../ui/embeds";
import { formatNumber, truncate } from "../../../ui/format";

const API = "https://api.clashroyale.com/v1";

const playerSchema = z.object({
	tag: z.string(),
	name: z.string(),
	expLevel: z.number(),
	trophies: z.number(),
	bestTrophies: z.number(),
	wins: z.number(),
	losses: z.number(),
	battleCount: z.number(),
	threeCrownWins: z.number(),
	donations: z.number(),
	arena: z.object({ name: z.string() }).optional(),
	clan: z.object({ name: z.string(), tag: z.string() }).optional(),
	currentDeck: z.array(z.object({ name: z.string(), level: z.number() })).default([]),
});

const clanSchema = z.object({
	tag: z.string(),
	name: z.string(),
	description: z.string().default(""),
	type: z.string(),
	clanScore: z.number(),
	clanWarTrophies: z.number().optional(),
	members: z.number(),
	requiredTrophies: z.number(),
	donationsPerWeek: z.number(),
	location: z.object({ name: z.string() }).optional(),
	memberList: z.array(z.object({ name: z.string(), trophies: z.number(), role: z.string() })).default([]),
});

function normaliseTag(input: string): string {
	const cleaned = input.trim().toUpperCase().replace(/^#/, "").replace(/O/g, "0");
	return `%23${cleaned}`;
}

export default defineCommand({
	name: "clash-royale",
	description: "Looks up Clash Royale players and clans.",
	category: Category.Community,
	surfaces: ["slash"],
	cooldownMs: 5_000,
	subcommands: [
		{
			name: "player",
			description: "Look up a player by tag.",
			options: [{ name: "tag", description: "The player tag, for example #ABC123.", type: "string", required: true }],
			async execute(ctx) {
				const apiKey = ctx.client.env.CLASH_ROYALE_API_KEY;
				if (apiKey === undefined) throw new ConfigurationError("CLASH_ROYALE_API_KEY is not configured.");

				await ctx.defer();
				const tag = normaliseTag(ctx.options.getString("tag", true));

				const player = await fetchJson("clash-royale", `${API}/players/${tag}`, playerSchema, {
					headers: { Authorization: `Bearer ${apiKey}` },
				}).catch(() => null);

				if (!player) throw new NotFoundError("No player with that tag was found.");

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Community,
							title: `${player.name} (${player.tag})`,
							fields: [
								{ name: "Level", value: String(player.expLevel), inline: true },
								{ name: "Trophies", value: formatNumber(player.trophies), inline: true },
								{ name: "Personal best", value: formatNumber(player.bestTrophies), inline: true },
								{ name: "Arena", value: player.arena?.name ?? "Unknown", inline: true },
								{
									name: "Clan",
									value: player.clan ? `${player.clan.name} (${player.clan.tag})` : "None",
									inline: true,
								},
								{ name: "Donations", value: formatNumber(player.donations), inline: true },
								{ name: "Wins", value: formatNumber(player.wins), inline: true },
								{ name: "Losses", value: formatNumber(player.losses), inline: true },
								{ name: "Three-crown wins", value: formatNumber(player.threeCrownWins), inline: true },
								{
									name: "Current deck",
									value: player.currentDeck.map((card) => `${card.name} (lvl ${card.level})`).join(", ") || "Unknown",
								},
							],
						}),
					],
				});
			},
		},
		{
			name: "clan",
			description: "Look up a clan by tag.",
			options: [{ name: "tag", description: "The clan tag, for example #ABC123.", type: "string", required: true }],
			async execute(ctx) {
				const apiKey = ctx.client.env.CLASH_ROYALE_API_KEY;
				if (apiKey === undefined) throw new ConfigurationError("CLASH_ROYALE_API_KEY is not configured.");

				await ctx.defer();
				const tag = normaliseTag(ctx.options.getString("tag", true));

				const clan = await fetchJson("clash-royale", `${API}/clans/${tag}`, clanSchema, {
					headers: { Authorization: `Bearer ${apiKey}` },
				}).catch(() => null);

				if (!clan) throw new NotFoundError("No clan with that tag was found.");

				const top = [...clan.memberList].sort((a, b) => b.trophies - a.trophies).slice(0, 10);

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Community,
							title: `${clan.name} (${clan.tag})`,
							description: truncate(clan.description, 500),
							fields: [
								{ name: "Score", value: formatNumber(clan.clanScore), inline: true },
								{ name: "War trophies", value: formatNumber(clan.clanWarTrophies ?? 0), inline: true },
								{ name: "Members", value: `${clan.members} / 50`, inline: true },
								{ name: "Type", value: clan.type, inline: true },
								{ name: "Required trophies", value: formatNumber(clan.requiredTrophies), inline: true },
								{ name: "Donations per week", value: formatNumber(clan.donationsPerWeek), inline: true },
								{ name: "Location", value: clan.location?.name ?? "Unknown", inline: true },
								{
									name: "Top members",
									value:
										top
											.map(
												(member, index) => `\`${index + 1}.\` ${member.name} \u2014 ${formatNumber(member.trophies)}`,
											)
											.join("\n") || "None",
								},
							],
						}),
					],
				});
			},
		},
	],

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand: `player` or `clan`.", ephemeral: true });
	},
});
