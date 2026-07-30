import { MessageFlags } from "discord.js";
import { balancesOf } from "@buttons/shop";
import { strings } from "@config/strings";
import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { adjustWallet, debitWallet, requireAccount, setFields } from "@database/repositories/economyRepository";
import { embed, successEmbed } from "@lib/embeds.util";
import { discordTime, formatNumber, progressBar } from "@lib/format.util";
import { decayValue, findPet, petStatus } from "@lib/pets.util";
import { reply } from "@lib/reply.util";
import { isPetRarity, shopScreen } from "@lib/shopScreen.util";

const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"] as const;

export default defineCommand({
	name: "pet",
	description: "Looks after your pet. Adopt one from the shop.",
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
			name: "rename",
			description: "Give your pet a name of your own.",
			options: [{ name: "name", description: "What to call it.", type: "string", required: true, maxLength: 32 }],
			async run(interaction) {
				const guild = inGuild(interaction);
				const account = await requireAccount(guild.id, interaction.user.id);
				const pet = account.pet;
				if (!pet?.petId) throw new UserFacingError("You do not have a pet yet. Adopt one from `/shop`.");

				const name = interaction.options.getString("name", true).trim();
				if (name.length === 0) throw new UserFacingError("Give it an actual name.");

				await setFields(guild.id, interaction.user.id, { pet: { ...pet, name } });
				await reply(interaction, { embeds: [successEmbed(`${pet.emoji ?? ""} is now called **${name}**.`)] });
			},
		},
		{
			name: "rehome",
			description: "Rehome your pet for half of what you paid.",
			aliases: ["rehome"],
			async run(interaction) {
				const guild = inGuild(interaction);
				const account = await requireAccount(guild.id, interaction.user.id);
				const pet = account.pet;
				if (!pet?.petId) throw new UserFacingError("You do not have a pet to rehome.");

				const species = findPet(pet.petId);
				const refund = Math.floor((species?.price ?? 0) / 2);

				await setFields(guild.id, interaction.user.id, { pet: null });
				if (refund > 0) await adjustWallet(guild.id, interaction.user.id, refund);

				await reply(interaction, {
					embeds: [
						successEmbed(
							`${pet.emoji ?? ""} **${pet.name ?? "Your pet"}** has found a new home. You received **${formatNumber(refund)}**.`,
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
			content: "Pick a subcommand: `shop`, `view`, `feed`, `walk`, `rename` or `rehome`.",
			flags: MessageFlags.Ephemeral,
		});
	},
});
