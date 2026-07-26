import { Category } from "../../../config/categories";
import { ECONOMY } from "../../../config/constants";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { createAccount, deleteAccount, findAccount } from "../../../database/repositories/economyRepository";
import { embed, successEmbed } from "../../../ui/embeds";
import { formatNumber } from "../../../ui/format";

export default defineCommand({
	name: "economy",
	description: "Manages your economy account.",
	category: Category.Economy,
	surfaces: ["slash", "prefix"],
	guildOnly: true,
	subcommands: [
		{
			name: "create",
			description: "Open an economy account in this server.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const account = await createAccount(guild.id, ctx.user.id);
				if (!account) throw new UserFacingError("You already have an account here.");

				await ctx.reply({
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
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const deleted = await deleteAccount(guild.id, ctx.user.id);
				if (!deleted) throw new UserFacingError("You do not have an account here.");

				await ctx.reply({ embeds: [successEmbed("Your economy account has been deleted.")] });
			},
		},
		{
			name: "status",
			description: "Check whether you have an account.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const account = await findAccount(guild.id, ctx.user.id);

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Economy,
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

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand: `create`, `delete` or `status`.", ephemeral: true });
	},
});
