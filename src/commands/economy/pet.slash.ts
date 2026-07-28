import { MessageFlags } from "discord.js";
import { balancesOf } from "@buttons/shop";
import { strings } from "@config/strings";
import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { debitWallet, requireAccount, setFields } from "@database/repositories/economyRepository";
import { embed, successEmbed } from "@lib/embeds.util";
import { discordTime, formatNumber, progressBar } from "@lib/format.util";
import { ALL_PETS, decayValue, findPet, petStatus } from "@lib/pets.util";
import { reply } from "@lib/reply.util";
import { isPetRarity, shopScreen } from "@lib/shopScreen.util";

const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"] as const;

export default defineCommand({
	name: "pet",
	description: "Buys and looks after a pet.",
	category: "economy",
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
			async run(interaction) {
				const guild = inGuild(interaction);
				const rarity = interaction.options.getString("rarity") ?? "common";
				const account = await requireAccount(guild.id, interaction.user.id);

				// The pet shop is the shop's pets section — one browser, not two.
				await reply(
					interaction,
					shopScreen(
						{ section: "pets", ...(isPetRarity(rarity) ? { rarity } : {}) },
						balancesOf(account),
						interaction.user.id,
					),
				);
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
			async run(interaction) {
				const guild = inGuild(interaction);
				const account = await requireAccount(guild.id, interaction.user.id);
				if (account.pet?.petId !== null && account.pet?.petId !== undefined) {
					throw new UserFacingError("You already have a pet. Use `/rehome` before adopting another.");
				}

				const speciesId = interaction.options.getString("species", true).toLowerCase().replace(/\s+/g, "_");
				const species = findPet(speciesId);
				if (!species) throw new UserFacingError(`There is no pet with the id \`${speciesId}\`.`);

				const paid = await debitWallet(guild.id, interaction.user.id, species.price);
				if (!paid) throw new UserFacingError(strings.economy.insufficientWallet(species.price - account.wallet));

				const now = new Date();
				await setFields(guild.id, interaction.user.id, {
					pet: {
						petId: species.id,
						name: interaction.options.getString("name", true),
						type: species.rarity,
						emoji: species.emoji,
						happiness: 100,
						hunger: 100,
						purchasedAt: now,
						lastFed: now,
						lastWalked: now,
					},
				});

				await reply(interaction, {
					embeds: [
						successEmbed(
							`You adopted ${species.emoji} **${interaction.options.getString("name", true)}** the ${species.name}.`,
						),
					],
				});
			},
		},
		{
			name: "view",
			description: "Check on your pet.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const account = await requireAccount(guild.id, interaction.user.id);
				const pet = account.pet;
				if (!pet?.petId) throw new UserFacingError("You do not have a pet yet. Try `/pet shop`.");

				const happiness = decayValue(pet.happiness, pet.lastWalked);
				const hunger = decayValue(pet.hunger, pet.lastFed);
				const status = petStatus(happiness, hunger);
				const species = findPet(pet.petId);

				await reply(interaction, {
					embeds: [
						embed({
							category: "economy",
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
			async run(interaction) {
				const guild = inGuild(interaction);
				const account = await requireAccount(guild.id, interaction.user.id);
				const pet = account.pet;
				if (!pet?.petId) throw new UserFacingError("You do not have a pet yet.");

				const species = findPet(pet.petId);
				const cost = species?.feedCost ?? 50;

				const paid = await debitWallet(guild.id, interaction.user.id, cost);
				if (!paid) throw new UserFacingError(strings.economy.insufficientWallet(cost - account.wallet));

				await setFields(guild.id, interaction.user.id, {
					pet: { ...pet, hunger: 100, lastFed: new Date() },
				});

				await reply(interaction, {
					embeds: [
						successEmbed(`You fed ${pet.emoji ?? ""} **${pet.name ?? "your pet"}** for **${formatNumber(cost)}**.`),
					],
				});
			},
		},
		{
			name: "walk",
			description: "Take your pet out and cheer it up.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const account = await requireAccount(guild.id, interaction.user.id);
				const pet = account.pet;
				if (!pet?.petId) throw new UserFacingError("You do not have a pet yet.");

				const species = findPet(pet.petId);
				const happiness = Math.min(
					100,
					decayValue(pet.happiness, pet.lastWalked) + (species?.happinessBoost ?? 2) * 10,
				);

				await setFields(guild.id, interaction.user.id, {
					pet: { ...pet, happiness, lastWalked: new Date() },
				});

				await reply(interaction, {
					embeds: [
						successEmbed(
							`You took ${pet.emoji ?? ""} **${pet.name ?? "your pet"}** out. Happiness is now **${happiness}%**.`,
						),
					],
				});
			},
		},
	],

	async run(interaction) {
		await reply(interaction, {
			content: "Pick a subcommand: `shop`, `buy`, `view`, `feed` or `walk`.",
			flags: MessageFlags.Ephemeral,
		});
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
