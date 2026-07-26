import { randomInt } from "node:crypto";
import { type TestifyClient } from "../core/client";
import { type LotteryWinner } from "../database/models/lottery";
import { adjustWallet } from "../database/repositories/economyRepository";
import { claimDueDraw, recordDraw } from "../database/repositories/lotteryRepository";
import { embed } from "../lib/embeds";
import { formatNumber } from "../lib/format";

/**
 * The draw is claimed by pushing `nextDrawTime` forward inside the same query
 * that selects it, so a slow draw can no longer overlap the next tick and pay out
 * twice. The old job also called `save()` on the same document twice.
 */
export async function runLotteryDraws(client: TestifyClient): Promise<void> {
	for (let processed = 0; processed < 10; processed += 1) {
		const lottery = await claimDueDraw();
		if (!lottery) return;

		const tickets = lottery.entries.flatMap((entry) => Array.from({ length: entry.tickets }, () => entry));
		const channel = await client.channels.fetch(lottery.announcementChannelId).catch(() => null);

		if (tickets.length === 0) {
			await recordDraw(
				lottery.guildId,
				{ drawTime: new Date(), totalPrizePool: lottery.prizePool, totalTickets: 0, winners: [] },
				lottery.basePrizePool,
			);

			if (channel?.isTextBased() && channel.isSendable()) {
				await channel.send({
					embeds: [
						embed({
							category: "economy",
							title: "Lottery draw",
							description: "Nobody entered this round, so the prize pool rolls over.",
						}),
					],
				});
			}
			continue;
		}

		const winners: LotteryWinner[] = [];
		const chosen = new Set<string>();
		const share = Math.floor(lottery.prizePool / Math.min(lottery.maxWinners, tickets.length));

		while (winners.length < lottery.maxWinners && chosen.size < new Set(tickets.map((entry) => entry.userId)).size) {
			const ticket = tickets[randomInt(tickets.length)]!;
			if (chosen.has(ticket.userId)) continue;

			chosen.add(ticket.userId);
			winners.push({ userId: ticket.userId, userTag: ticket.userTag, prizeAmount: share });
			await adjustWallet(lottery.guildId, ticket.userId, share);
		}

		await recordDraw(
			lottery.guildId,
			{
				drawTime: new Date(),
				totalPrizePool: lottery.prizePool,
				totalTickets: tickets.length,
				winners,
			},
			lottery.basePrizePool,
		);

		if (channel?.isTextBased() && channel.isSendable()) {
			await channel.send({
				embeds: [
					embed({
						category: "economy",
						title: "\u{1f39f}\ufe0f Lottery draw",
						description: `**${formatNumber(lottery.prizePool)}** was shared between ${winners.length} winner(s).`,
						fields: [
							{
								name: "Winners",
								value: winners
									.map((winner) => `<@${winner.userId}> \u2014 **${formatNumber(winner.prizeAmount)}**`)
									.join("\n"),
							},
							{ name: "Tickets sold", value: formatNumber(tickets.length), inline: true },
						],
					}),
				],
			});
		}
	}
}
