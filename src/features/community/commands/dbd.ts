import { randomInt } from "node:crypto";
import { ButtonStyle } from "discord.js";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { encodeId, Namespace } from "../../../core/customId";
import { NotFoundError } from "../../../core/errors";
import { button, row } from "../../../ui/components";
import { embed } from "../../../ui/embeds";
import { titleCase, truncate } from "../../../ui/format";
import { allPerks, findPerk, randomBuild, renderDescription, searchPerks } from "../services/dbdPerks";

export function buildEmbed(role: "survivor" | "killer") {
	const perks = randomBuild(role, (max) => randomInt(max));

	return embed({
		category: Category.Community,
		title: `Random ${role} build`,
		fields: perks.map((perk) => ({
			name: perk.name,
			value: truncate(renderDescription(perk), 400),
			inline: false,
		})),
		footer: "Dead by Daylight",
	});
}

export default defineCommand({
	name: "dbd",
	description: "Dead by Daylight perk lookups and random builds.",
	category: Category.Community,
	surfaces: ["slash", "prefix"],
	cooldownMs: 3_000,
	subcommands: [
		{
			name: "perk",
			description: "Look up a perk.",
			options: [
				{
					name: "name",
					description: "The perk name.",
					type: "string",
					required: true,
					autocomplete: true,
					greedy: true,
				},
			],
			async execute(ctx) {
				const query = ctx.options.getString("name", true);
				const perk = findPerk(query);
				if (!perk) throw new NotFoundError(`No perk matches **${query}**.`);

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Community,
							title: perk.name,
							description: truncate(renderDescription(perk), 2_000),
							fields: [
								{ name: "Role", value: titleCase(perk.role), inline: true },
								{
									name: "Categories",
									value: perk.categories.map(titleCase).join(", ") || "None",
									inline: true,
								},
							],
							footer: "Dead by Daylight",
						}),
					],
				});
			},
		},
		{
			name: "build",
			description: "Roll a random four-perk build.",
			options: [
				{
					name: "role",
					description: "Survivor or killer.",
					type: "string",
					choices: [
						{ name: "survivor", value: "survivor" },
						{ name: "killer", value: "killer" },
					],
				},
			],
			async execute(ctx) {
				const role = (ctx.options.getString("role") ?? "survivor") as "survivor" | "killer";

				await ctx.reply({
					embeds: [buildEmbed(role)],
					components: [
						row(
							button({
								id: encodeId(Namespace.Dbd, "reroll", role, ctx.user.id),
								label: "Reroll",
								style: ButtonStyle.Primary,
							}),
						),
					],
				});
			},
		},
		{
			name: "stats",
			description: "How many perks are in the database.",
			async execute(ctx) {
				await ctx.reply({
					embeds: [
						embed({
							category: Category.Community,
							title: "Perk database",
							fields: [
								{ name: "Survivor perks", value: String(allPerks("survivor").length), inline: true },
								{ name: "Killer perks", value: String(allPerks("killer").length), inline: true },
								{ name: "Total", value: String(allPerks().length), inline: true },
							],
						}),
					],
				});
			},
		},
	],

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand: `perk`, `build` or `stats`.", ephemeral: true });
	},

	async autocomplete(interaction) {
		const query = interaction.options.getFocused();
		const matches = searchPerks(query);
		await interaction.respond(matches.map((perk) => ({ name: perk.name, value: perk.name })));
	},
});
