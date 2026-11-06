import { PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { createAccount, deleteAccount, findAccount } from "@database/repositories/economyRepository";
import { getTuning } from "@database/repositories/tuningRepository";
import { embed, reply, successEmbed } from "@lib/discord";
import { sellShopRole, tuningPanel, withdrawShopRole } from "@lib/economy";
import { formatNumber } from "@lib/format";
import { SHOP_ROLE_LIMITS } from "@testify/shared";

export default defineCommand({
	name: "economy",
	description: "Manages your economy account.",
	category: "economy",
	private: true,
	guildOnly: true,
	subcommands: [
		{
			name: "create",
			description: "Open an economy account in this server.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const account = await createAccount(guild.id, interaction.user.id);
				if (!account) throw new UserFacingError("You already have an account here.");

				await reply(interaction, {
					embeds: [
						successEmbed(
							`Your account is open with **${formatNumber(account.wallet)}** in your wallet. Try \`/daily\` next.`,
						),
					],
				});
			},
		},
		{
			name: "delete",
			description: "Close your account and erase your balance.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const deleted = await deleteAccount(guild.id, interaction.user.id);
				if (!deleted) throw new UserFacingError("You do not have an account here.");

				await reply(interaction, { embeds: [successEmbed("Your economy account has been deleted.")] });
			},
		},
		{
			name: "settings",
			description: "Sets this server's pay, starting money, robbing and XP rate.",
			permissions: [PermissionFlagsBits.ManageGuild],
			async run(interaction) {
				const guild = inGuild(interaction);
				await reply(interaction, tuningPanel(await getTuning(guild.id), interaction.user.id));
			},
		},
		{
			name: "shop-role",
			description: "Puts a role on sale in the shop, changes its price, or takes it off with a price of 0.",
			permissions: [PermissionFlagsBits.ManageRoles],
			options: [
				{ name: "role", description: "The role to sell.", type: "role", required: true },
				{
					name: "price",
					description: "What it costs. 0 takes it off sale.",
					type: "integer",
					required: true,
					min: 0,
					max: SHOP_ROLE_LIMITS.maxPrice,
				},
			],
			async run(interaction) {
				const guild = inGuild(interaction);
				const role = interaction.options.getRole("role", true);
				const price = interaction.options.getInteger("price", true);
				const actor = await guild.members.fetch(interaction.user.id).catch(() => undefined);

				if (price === 0) {
					await withdrawShopRole(guild, role.id);
					await reply(interaction, { embeds: [successEmbed(`**${role.name}** is no longer for sale.`)] });
					return;
				}

				await sellShopRole(guild, actor, role.id, price, interaction.user.id);
				await reply(interaction, {
					embeds: [successEmbed(`**${role.name}** is on sale in the shop for **${formatNumber(price)}**.`)],
				});
			},
		},
		{
			name: "status",
			description: "Check whether you have an account.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const account = await findAccount(guild.id, interaction.user.id);

				await reply(interaction, {
					embeds: [
						embed({
							category: "economy",
							title: "Account status",
							description: account
								? `Open since <t:${Math.floor(account.createdAt.getTime() / 1_000)}:D>.`
								: "You do not have an account yet. Use `/economy create`.",
						}),
					],
				});
			},
		},
	],
});
