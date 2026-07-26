import { ECONOMY } from "../../config/constants";
import { defineCommand, inGuild } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { createAccount, deleteAccount, findAccount } from "../../database/repositories/economyRepository";
import { embed, successEmbed } from "../../lib/embeds";
import { formatNumber } from "../../lib/format";
import { reply } from "../../lib/reply";

export default defineCommand({
	name: "economy",
	description: "Manages your economy account.",
	category: "economy",
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
							`Your account is open with **${formatNumber(ECONOMY.startingWallet)}** in your wallet. Try \`/daily\` next.`,
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
