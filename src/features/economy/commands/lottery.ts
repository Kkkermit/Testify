import { PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { strings } from "../../../config/strings";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { debitWallet, requireAccount } from "../../../database/repositories/economyRepository";
import {
	addEntry,
	deleteLottery,
	getLottery,
	intervalFor,
	saveLottery,
} from "../../../database/repositories/lotteryRepository";
import { type LotteryFrequency } from "../../../database/models/lottery";
import { embed, successEmbed } from "../../../ui/embeds";
import { discordTime, formatNumber } from "../../../ui/format";

const FREQUENCIES: LotteryFrequency[] = ["hourly", "daily", "weekly"];

export default defineCommand({
	name: "lottery",
	description: "Runs and enters the server lottery.",
	category: Category.Economy,
	surfaces: ["slash", "prefix"],
	guildOnly: true,
	subcommands: [
		{
			name: "info",
			description: "Show the current lottery.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const lottery = await getLottery(guild.id);
				if (!lottery) throw new UserFacingError("No lottery is set up in this server.");

				const tickets = lottery.entries.reduce((total, entry) => total + entry.tickets, 0);
				const mine = lottery.entries.find((entry) => entry.userId === ctx.user.id)?.tickets ?? 0;

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Economy,
							title: "\u{1f39f}\ufe0f Server lottery",
							fields: [
								{ name: "Prize pool", value: formatNumber(lottery.prizePool), inline: true },
								{ name: "Entry fee", value: formatNumber(lottery.entryFee), inline: true },
								{ name: "Winners", value: String(lottery.maxWinners), inline: true },
								{ name: "Tickets sold", value: formatNumber(tickets), inline: true },
								{ name: "Your tickets", value: formatNumber(mine), inline: true },
								{ name: "Frequency", value: lottery.frequency, inline: true },
								{ name: "Next draw", value: discordTime(lottery.nextDrawTime, "R") },
								{ name: "Status", value: lottery.isFrozen ? "Frozen" : lottery.isActive ? "Running" : "Stopped" },
							],
						}),
					],
				});
			},
		},
		{
			name: "enter",
			description: "Buy lottery tickets.",
			options: [
				{ name: "tickets", description: "How many tickets to buy.", type: "integer", minValue: 1, maxValue: 100 },
			],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const lottery = await getLottery(guild.id);
				if (!lottery) throw new UserFacingError("No lottery is set up in this server.");
				if (!lottery.isActive) throw new UserFacingError("The lottery is not running right now.");
				if (lottery.isFrozen) throw new UserFacingError("The lottery is frozen and not accepting entries.");

				const tickets = ctx.options.getInteger("tickets") ?? 1;
				const cost = lottery.entryFee * tickets;

				const account = await requireAccount(guild.id, ctx.user.id);
				const paid = await debitWallet(guild.id, ctx.user.id, cost);
				if (!paid) throw new UserFacingError(strings.economy.insufficientWallet(cost - account.wallet));

				const updated = await addEntry(guild.id, { userId: ctx.user.id, userTag: ctx.user.username, tickets }, cost);
				if (!updated) throw new UserFacingError("The lottery closed before your entry landed. You have been refunded.");

				await ctx.reply({
					embeds: [
						successEmbed(
							`You bought **${tickets}** ticket(s) for **${formatNumber(cost)}**.\nPrize pool is now **${formatNumber(updated.prizePool)}**.`,
						),
					],
				});
			},
		},
		{
			name: "setup",
			description: "Create or reconfigure the lottery.",
			options: [
				{ name: "entry-fee", description: "Cost of one ticket.", type: "integer", required: true, minValue: 1 },
				{ name: "channel", description: "Where draws are announced.", type: "channel", required: true },
				{
					name: "frequency",
					description: "How often the draw runs.",
					type: "string",
					choices: FREQUENCIES.map((frequency) => ({ name: frequency, value: frequency })),
				},
				{ name: "winners", description: "How many winners per draw.", type: "integer", minValue: 1, maxValue: 10 },
				{ name: "base-pool", description: "Prize money seeded into every round.", type: "integer", minValue: 0 },
			],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const channel = ctx.options.getChannel("channel");
				if (!channel?.isTextBased() || !channel.isSendable()) {
					throw new UserFacingError("Pick a text channel I can post the results in.");
				}

				const frequency = (ctx.options.getString("frequency") ?? "weekly") as LotteryFrequency;
				const basePrizePool = ctx.options.getInteger("base-pool") ?? 0;

				await saveLottery(guild.id, {
					isActive: true,
					isFrozen: false,
					entryFee: ctx.options.getInteger("entry-fee", true),
					maxWinners: ctx.options.getInteger("winners") ?? 1,
					frequency,
					basePrizePool,
					prizePool: basePrizePool,
					nextDrawTime: new Date(Date.now() + intervalFor(frequency)),
					announcementChannelId: channel.id,
					lastModifiedBy: ctx.user.id,
				});

				await ctx.reply({ embeds: [successEmbed(`The lottery is running. Draws happen ${frequency} in ${channel}.`)] });
			},
		},
		{
			name: "freeze",
			description: "Pause or resume the lottery.",
			options: [{ name: "frozen", description: "Whether the lottery is frozen.", type: "boolean", required: true }],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const lottery = await getLottery(guild.id);
				if (!lottery) throw new UserFacingError("No lottery is set up in this server.");

				const frozen = ctx.options.getBoolean("frozen", true);
				await saveLottery(guild.id, { isFrozen: frozen, lastModifiedBy: ctx.user.id });

				await ctx.reply({
					embeds: [successEmbed(frozen ? "The lottery is frozen." : "The lottery is running again.")],
				});
			},
		},
		{
			name: "delete",
			description: "Remove the lottery entirely.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const removed = await deleteLottery(guild.id);
				if (!removed) throw new UserFacingError("No lottery is set up in this server.");

				await ctx.reply({ embeds: [successEmbed("The lottery has been deleted.")] });
			},
		},
	],

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand: `info`, `enter`, `setup`, `freeze` or `delete`.", ephemeral: true });
	},
});

export const LOTTERY_ADMIN_PERMISSION = PermissionFlagsBits.ManageGuild;
