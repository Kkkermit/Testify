import { defineCommand, inGuild } from "../../core/command";
import { getGuildTotals, requireAccount } from "../../database/repositories/economyRepository";
import { embed } from "../../lib/embeds";
import { discordTime, formatNumber } from "../../lib/format";
import { decayValue, petStatus } from "../../lib/pets";
import { reply } from "../../lib/reply";

export default defineCommand({
	name: "economy-info",
	description: "Detailed economy information.",
	category: "economy",
	guildOnly: true,
	subcommands: [
		{
			name: "account",
			description: "Everything about one account.",
			options: [{ name: "user", description: "Whose account. Defaults to you.", type: "user" }],
			async run(interaction) {
				const guild = inGuild(interaction);
				const target = interaction.options.getUser("user") ?? interaction.user;
				const account = await requireAccount(guild.id, target.id);

				const pet = account.pet;
				const petLine =
					pet && pet.petId !== null
						? (() => {
								const happiness = decayValue(pet.happiness, pet.lastWalked);
								const hunger = decayValue(pet.hunger, pet.lastFed);
								const status = petStatus(happiness, hunger);
								return `${pet.emoji ?? ""} **${pet.name ?? "Unnamed"}** \u2014 ${status.emoji} ${status.mood}`;
							})()
						: "No pet";

				await reply(interaction, {
					embeds: [
						embed({
							category: "economy",
							title: `${target.username}'s account`,
							fields: [
								{ name: "Wallet", value: formatNumber(account.wallet), inline: true },
								{ name: "Bank", value: formatNumber(account.bank), inline: true },
								{ name: "Net worth", value: formatNumber(account.wallet + account.bank), inline: true },
								{ name: "Job", value: `${account.job} (level ${account.jobLevel})`, inline: true },
								{ name: "Daily streak", value: `${account.dailyStreak} day(s)`, inline: true },
								{ name: "Shifts worked", value: formatNumber(account.worked), inline: true },
								{
									name: "Robberies",
									value: `\u2705 ${account.robberySuccess} \u00b7 \u274c ${account.robberyFailed}`,
									inline: true,
								},
								{
									name: "Heists",
									value: `\u2705 ${account.heistSuccess} \u00b7 \u274c ${account.heistFailed}`,
									inline: true,
								},
								{ name: "Times gambled", value: formatNumber(account.gambled), inline: true },
								{
									name: "House",
									value: account.house ? `${account.house.emoji} ${account.house.name}` : "None",
									inline: true,
								},
								{
									name: `Businesses (${account.businesses.length})`,
									value: account.businesses.map((entry) => `${entry.emoji} ${entry.name}`).join(", ") || "None",
									inline: true,
								},
								{ name: "Pet", value: petLine, inline: true },
								{ name: "Inventory", value: `${account.inventory.length} item type(s)`, inline: true },
								{ name: "Account opened", value: discordTime(account.createdAt, "D"), inline: true },
							],
							thumbnail: target.displayAvatarURL(),
						}),
					],
				});
			},
		},
		{
			name: "server",
			description: "Economy totals across this server.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const totals = await getGuildTotals(guild.id);

				await reply(interaction, {
					embeds: [
						embed({
							category: "economy",
							title: `${guild.name} economy`,
							fields: [
								{ name: "Accounts", value: formatNumber(totals.accounts), inline: true },
								{ name: "In wallets", value: formatNumber(totals.wallet), inline: true },
								{ name: "In banks", value: formatNumber(totals.bank), inline: true },
								{ name: "Total in circulation", value: formatNumber(totals.wallet + totals.bank), inline: true },
								{
									name: "Average net worth",
									value: formatNumber(
										totals.accounts > 0 ? Math.round((totals.wallet + totals.bank) / totals.accounts) : 0,
									),
									inline: true,
								},
								{
									name: "Richest",
									value: totals.richest ? `<@${totals.richest.userId}>` : "Nobody yet",
									inline: true,
								},
							],
							...(guild.iconURL() !== null ? { thumbnail: guild.iconURL()! } : {}),
						}),
					],
				});
			},
		},
	],
});
