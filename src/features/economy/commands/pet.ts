import { Category } from "../../../config/categories";
import { strings } from "../../../config/strings";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { debitWallet, requireAccount, setFields } from "../../../database/repositories/economyRepository";
import { embed, successEmbed } from "../../../ui/embeds";
import { discordTime, formatNumber, progressBar } from "../../../ui/format";
import { ALL_PETS, decayValue, findPet, PETS_BY_RARITY, petStatus } from "../data/pets";

const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"] as const;

export default defineCommand({
	name: "pet",
	description: "Buys and looks after a pet.",
	category: Category.Economy,
	surfaces: ["slash", "prefix"],
	guildOnly: true,
	subcommands: [
		{
			name: "shop",
			description: "Browse the pets for sale.",
			options: [
				{
					name: "rarity",
					description: "Which tier to browse.",
					type: "string",
					choices: RARITIES.map((rarity) => ({ name: rarity, value: rarity })),
				},
			],
			async execute(ctx) {
				const rarity = (ctx.options.getString("rarity") ?? "common") as (typeof RARITIES)[number];
				const pets = PETS_BY_RARITY[rarity];

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Economy,
							title: `Pet shop \u2014 ${rarity}`,
							description: "Buy one with `/pet buy <id> <name>`.",
							fields: pets.map((pet) => ({
								name: `${pet.emoji} ${pet.name} \u2014 ${formatNumber(pet.price)}`,
								value: `${pet.description}\nFeeding: **${formatNumber(pet.feedCost)}** \u00b7 Income bonus: **+${pet.incomeBonus}**\n\`${pet.id}\``,
								inline: false,
							})),
						}),
					],
				});
			},
		},
		{
			name: "buy",
			description: "Adopt a pet.",
			options: [
				{
					name: "species",
					description: "The pet id from the shop.",
					type: "string",
					required: true,
					autocomplete: true,
				},
				{ name: "name", description: "What to call it.", type: "string", required: true, maxLength: 32 },
			],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const account = await requireAccount(guild.id, ctx.user.id);
				if (account.pet?.petId !== null && account.pet?.petId !== undefined) {
					throw new UserFacingError("You already have a pet. Use `/rehome` before adopting another.");
				}

				const speciesId = ctx.options.getString("species", true).toLowerCase().replace(/\s+/g, "_");
				const species = findPet(speciesId);
				if (!species) throw new UserFacingError(`There is no pet with the id \`${speciesId}\`.`);

				const paid = await debitWallet(guild.id, ctx.user.id, species.price);
				if (!paid) throw new UserFacingError(strings.economy.insufficientWallet(species.price - account.wallet));

				const now = new Date();
				await setFields(guild.id, ctx.user.id, {
					pet: {
						petId: species.id,
						name: ctx.options.getString("name", true),
						type: species.rarity,
						emoji: species.emoji,
						happiness: 100,
						hunger: 100,
						purchasedAt: now,
						lastFed: now,
						lastWalked: now,
					},
				});

				await ctx.reply({
					embeds: [
						successEmbed(
							`You adopted ${species.emoji} **${ctx.options.getString("name", true)}** the ${species.name}.`,
						),
					],
				});
			},
		},
		{
			name: "view",
			description: "Check on your pet.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const account = await requireAccount(guild.id, ctx.user.id);
				const pet = account.pet;
				if (!pet?.petId) throw new UserFacingError("You do not have a pet yet. Try `/pet shop`.");

				const happiness = decayValue(pet.happiness, pet.lastWalked);
				const hunger = decayValue(pet.hunger, pet.lastFed);
				const status = petStatus(happiness, hunger);
				const species = findPet(pet.petId);

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Economy,
							title: `${pet.emoji ?? ""} ${pet.name ?? "Your pet"}`,
							description: `${status.emoji} **${status.mood}**`,
							fields: [
								{ name: "Species", value: species?.name ?? pet.type ?? "Unknown", inline: true },
								{ name: "Rarity", value: species?.rarity ?? "Unknown", inline: true },
								{ name: "Income bonus", value: `+${species?.incomeBonus ?? 0}`, inline: true },
								{ name: "Happiness", value: `${progressBar(happiness, 100, 12)} ${happiness}%` },
								{ name: "Fullness", value: `${progressBar(hunger, 100, 12)} ${hunger}%` },
								{
									name: "Adopted",
									value: pet.purchasedAt ? discordTime(pet.purchasedAt, "R") : "Unknown",
									inline: true,
								},
							],
						}),
					],
				});
			},
		},
		{
			name: "feed",
			description: "Feed your pet.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const account = await requireAccount(guild.id, ctx.user.id);
				const pet = account.pet;
				if (!pet?.petId) throw new UserFacingError("You do not have a pet yet.");

				const species = findPet(pet.petId);
				const cost = species?.feedCost ?? 50;

				const paid = await debitWallet(guild.id, ctx.user.id, cost);
				if (!paid) throw new UserFacingError(strings.economy.insufficientWallet(cost - account.wallet));

				await setFields(guild.id, ctx.user.id, {
					pet: { ...pet, hunger: 100, lastFed: new Date() },
				});

				await ctx.reply({
					embeds: [
						successEmbed(`You fed ${pet.emoji ?? ""} **${pet.name ?? "your pet"}** for **${formatNumber(cost)}**.`),
					],
				});
			},
		},
		{
			name: "walk",
			description: "Take your pet out and cheer it up.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const account = await requireAccount(guild.id, ctx.user.id);
				const pet = account.pet;
				if (!pet?.petId) throw new UserFacingError("You do not have a pet yet.");

				const species = findPet(pet.petId);
				const happiness = Math.min(
					100,
					decayValue(pet.happiness, pet.lastWalked) + (species?.happinessBoost ?? 2) * 10,
				);

				await setFields(guild.id, ctx.user.id, {
					pet: { ...pet, happiness, lastWalked: new Date() },
				});

				await ctx.reply({
					embeds: [
						successEmbed(
							`You took ${pet.emoji ?? ""} **${pet.name ?? "your pet"}** out. Happiness is now **${happiness}%**.`,
						),
					],
				});
			},
		},
	],

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand: `shop`, `buy`, `view`, `feed` or `walk`.", ephemeral: true });
	},

	async autocomplete(interaction) {
		const query = interaction.options.getFocused().toLowerCase();
		const matches = ALL_PETS.filter((pet) => pet.id.includes(query) || pet.name.toLowerCase().includes(query)).slice(
			0,
			25,
		);

		await interaction.respond(
			matches.map((pet) => ({ name: `${pet.name} (${pet.rarity}) \u2014 ${pet.price}`, value: pet.id })),
		);
	},
});
