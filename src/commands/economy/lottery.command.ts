import { MessageFlags } from "discord.js";
import { strings } from "@config/strings";
import { defineCommand, inGuild, textChannelOption } from "@core/command";
import { UserFacingError } from "@core/errors";
import { type LotteryFrequency } from "@database/models/lottery.schema";
import { debitWallet, requireAccount } from "@database/repositories/economyRepository";
import {
	addEntry,
	deleteLottery,
	getLottery,
	intervalFor,
	saveLottery,
} from "@database/repositories/lotteryRepository";
import { embed, successEmbed } from "@lib/embeds.util";
import { discordTime, formatNumber } from "@lib/format.util";
import { reply } from "@lib/reply.util";

const FREQUENCIES: LotteryFrequency[] = ["hourly", "daily", "weekly"];

export default defineCommand({
	name: "lottery",
	description: "Runs and enters the server lottery.",
	category: "economy",
	guildOnly: true,
	subcommands: [
		{
			name: "info",
			description: "Show the current lottery.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const lottery = await getLottery(guild.id);
				if (!lottery) throw new UserFacingError("No lottery is set up in this server.");

				const tickets = lottery.entries.reduce((total, entry) => total + entry.tickets, 0);
				const mine = lottery.entries.find((entry) => entry.userId === interaction.user.id)?.tickets ?? 0;

				await reply(interaction, {
					embeds: [
						embed({
							category: "economy",
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
			options: [{ name: "tickets", description: "How many tickets to buy.", type: "integer", min: 1, max: 100 }],
			async run(interaction) {
				const guild = inGuild(interaction);
				const lottery = await getLottery(guild.id);
				if (!lottery) throw new UserFacingError("No lottery is set up in this server.");
				if (!lottery.isActive) throw new UserFacingError("The lottery is not running right now.");
				if (lottery.isFrozen) throw new UserFacingError("The lottery is frozen and not accepting entries.");

				const tickets = interaction.options.getInteger("tickets") ?? 1;
				const cost = lottery.entryFee * tickets;

				const account = await requireAccount(guild.id, interaction.user.id);
				const paid = await debitWallet(guild.id, interaction.user.id, cost);
				if (!paid) throw new UserFacingError(strings.economy.insufficientWallet(cost - account.wallet));

				const updated = await addEntry(
					guild.id,
					{ userId: interaction.user.id, userTag: interaction.user.username, tickets },
					cost,
				);
				if (!updated) throw new UserFacingError("The lottery closed before your entry landed. You have been refunded.");

				await reply(interaction, {
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
				{ name: "entry-fee", description: "Cost of one ticket.", type: "integer", required: true, min: 1 },
				{ name: "channel", description: "Where draws are announced.", type: "channel", required: true },
				{
					name: "frequency",
					description: "How often the draw runs.",
					type: "string",
					choices: FREQUENCIES.map((frequency) => ({ name: frequency, value: frequency })),
				},
				{ name: "winners", description: "How many winners per draw.", type: "integer", min: 1, max: 10 },
				{ name: "base-pool", description: "Prize money seeded into every round.", type: "integer", min: 0 },
			],
			async run(interaction) {
				const guild = inGuild(interaction);
				const channel = textChannelOption(interaction, "channel");
				if (!channel?.isTextBased() || !channel.isSendable()) {
					throw new UserFacingError("Pick a text channel I can post the results in.");
				}

				const frequency = (interaction.options.getString("frequency") ?? "weekly") as LotteryFrequency;
				const basePrizePool = interaction.options.getInteger("base-pool") ?? 0;

				await saveLottery(guild.id, {
					isActive: true,
					isFrozen: false,
					entryFee: interaction.options.getInteger("entry-fee", true),
					maxWinners: interaction.options.getInteger("winners") ?? 1,
					frequency,
					basePrizePool,
					prizePool: basePrizePool,
					nextDrawTime: new Date(Date.now() + intervalFor(frequency)),
					announcementChannelId: channel.id,
					lastModifiedBy: interaction.user.id,
				});

				await reply(interaction, {
					embeds: [successEmbed(`The lottery is running. Draws happen ${frequency} in ${channel}.`)],
				});
			},
		},
		{
			name: "freeze",
			description: "Pause or resume the lottery.",
			options: [{ name: "frozen", description: "Whether the lottery is frozen.", type: "boolean", required: true }],
			async run(interaction) {
				const guild = inGuild(interaction);
				const lottery = await getLottery(guild.id);
				if (!lottery) throw new UserFacingError("No lottery is set up in this server.");

				const frozen = interaction.options.getBoolean("frozen", true);
				await saveLottery(guild.id, { isFrozen: frozen, lastModifiedBy: interaction.user.id });

				await reply(interaction, {
					embeds: [successEmbed(frozen ? "The lottery is frozen." : "The lottery is running again.")],
				});
			},
		},
		{
			name: "delete",
			description: "Remove the lottery entirely.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const removed = await deleteLottery(guild.id);
				if (!removed) throw new UserFacingError("No lottery is set up in this server.");

				await reply(interaction, { embeds: [successEmbed("The lottery has been deleted.")] });
			},
		},
	],

	async run(interaction) {
		await reply(interaction, {
			content: "Pick a subcommand: `info`, `enter`, `setup`, `freeze` or `delete`.",
			flags: MessageFlags.Ephemeral,
		});
	},
});
