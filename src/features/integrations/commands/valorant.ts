import { randomInt } from "node:crypto";
import { Category } from "../../../config/categories";
import { theme } from "../../../config/theme";
import { defineCommand } from "../../../core/command";
import { NotFoundError } from "../../../core/errors";
import { fetchAgents, fetchMaps, fetchWeapons } from "../../../integrations/valorant";
import { embed } from "../../../ui/embeds";
import { formatNumber, truncate } from "../../../ui/format";

export default defineCommand({
	name: "valorant",
	description: "Looks up Valorant agents, weapons and maps.",
	category: Category.Integrations,
	surfaces: ["slash"],
	cooldownMs: 3_000,
	subcommands: [
		{
			name: "agent",
			description: "Show an agent's abilities.",
			options: [{ name: "name", description: "The agent name.", type: "string", required: true, autocomplete: true }],
			async execute(ctx) {
				await ctx.defer();

				const query = ctx.options.getString("name", true).toLowerCase();
				const agents = await fetchAgents();
				const agent =
					agents.find((candidate) => candidate.displayName.toLowerCase() === query) ??
					agents.find((candidate) => candidate.displayName.toLowerCase().includes(query));

				if (!agent) throw new NotFoundError(`No agent matches **${query}**.`);

				await ctx.reply({
					embeds: [
						embed({
							color: theme.colors.valorant,
							title: agent.displayName,
							description: truncate(agent.description, 800),
							fields: [
								{ name: "Role", value: agent.role?.displayName ?? "Unknown", inline: true },
								...agent.abilities
									.filter((ability) => ability.displayName !== null)
									.map((ability) => ({
										name: `${ability.slot}: ${ability.displayName ?? ""}`,
										value: truncate(ability.description ?? "No description.", 300),
										inline: false,
									})),
							],
							...(agent.displayIcon !== null ? { thumbnail: agent.displayIcon } : {}),
							...(agent.fullPortrait !== null ? { image: agent.fullPortrait } : {}),
						}),
					],
				});
			},
		},
		{
			name: "weapon",
			description: "Show a weapon's stats.",
			options: [{ name: "name", description: "The weapon name.", type: "string", required: true, autocomplete: true }],
			async execute(ctx) {
				await ctx.defer();

				const query = ctx.options.getString("name", true).toLowerCase();
				const weapons = await fetchWeapons();
				const weapon = weapons.find((candidate) => candidate.displayName.toLowerCase().includes(query));

				if (!weapon) throw new NotFoundError(`No weapon matches **${query}**.`);

				await ctx.reply({
					embeds: [
						embed({
							color: theme.colors.valorant,
							title: weapon.displayName,
							fields: [
								{ name: "Category", value: weapon.shopData?.categoryText ?? "Unknown", inline: true },
								{
									name: "Cost",
									value: weapon.shopData ? formatNumber(weapon.shopData.cost) : "Free",
									inline: true,
								},
								{
									name: "Magazine",
									value: weapon.weaponStats ? String(weapon.weaponStats.magazineSize) : "Unknown",
									inline: true,
								},
								{
									name: "Fire rate",
									value: weapon.weaponStats ? `${weapon.weaponStats.fireRate}/s` : "Unknown",
									inline: true,
								},
								{
									name: "Reload",
									value: weapon.weaponStats ? `${weapon.weaponStats.reloadTimeSeconds}s` : "Unknown",
									inline: true,
								},
							],
							...(weapon.displayIcon !== null ? { image: weapon.displayIcon } : {}),
						}),
					],
				});
			},
		},
		{
			name: "map",
			description: "Show a map, or a random one.",
			options: [{ name: "name", description: "The map name. Leave empty for a random map.", type: "string" }],
			async execute(ctx) {
				await ctx.defer();

				const maps = (await fetchMaps()).filter((entry) => entry.coordinates !== null);
				const query = ctx.options.getString("name")?.toLowerCase();

				const map =
					query !== undefined
						? maps.find((candidate) => candidate.displayName.toLowerCase().includes(query))
						: maps[randomInt(maps.length)];

				if (!map) throw new NotFoundError("No map matches that name.");

				await ctx.reply({
					embeds: [
						embed({
							color: theme.colors.valorant,
							title: map.displayName,
							description: map.coordinates ?? "",
							...(map.splash !== null ? { image: map.splash } : {}),
						}),
					],
				});
			},
		},
	],

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand: `agent`, `weapon` or `map`.", ephemeral: true });
	},

	async autocomplete(interaction) {
		const focused = interaction.options.getFocused(true);
		const query = focused.value.toLowerCase();

		const names =
			interaction.options.getSubcommand(false) === "weapon"
				? (await fetchWeapons()).map((weapon) => weapon.displayName)
				: (await fetchAgents()).map((agent) => agent.displayName);

		await interaction.respond(
			names
				.filter((name) => name.toLowerCase().includes(query))
				.slice(0, 25)
				.map((name) => ({ name, value: name })),
		);
	},
});
