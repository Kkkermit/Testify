import { randomInt } from "node:crypto";
import { type EmbedBuilder } from "discord.js";
import { type TestifyClient } from "@core/client";
import { type LotteryRecord, type LotteryWinner } from "@database/models/lottery.schema";
import { adjustWallet } from "@database/repositories/economyRepository";
import { claimDueDraw, recordDraw } from "@database/repositories/lotteryRepository";
import { embed } from "@lib/discord";
import { formatNumber } from "@lib/format";

const DRAWS_PER_RUN = 10;

type Ticket = LotteryRecord["entries"][number];

/** Different people picked by ticket, so more tickets is a better chance but never a second prize. */
function pickWinners(lottery: LotteryRecord, tickets: readonly Ticket[]): LotteryWinner[] {
	const entrants = new Set(tickets.map((ticket) => ticket.userId)).size;
	const count = Math.min(lottery.maxWinners, entrants);
	// Divided between the people who actually win, so a pot with fewer entrants than prizes is still paid out whole.
	const share = Math.floor(lottery.prizePool / count);
	const winners: LotteryWinner[] = [];
	const chosen = new Set<string>();

	while (winners.length < count) {
		const ticket = tickets[randomInt(tickets.length)];
		if (ticket === undefined || chosen.has(ticket.userId)) continue;

		chosen.add(ticket.userId);
		winners.push({ userId: ticket.userId, userTag: ticket.userTag, prizeAmount: share });
	}

	return winners;
}

function drawEmbed(lottery: LotteryRecord, winners: readonly LotteryWinner[], tickets: number): EmbedBuilder {
	const nextDraw = { name: "Next draw", value: `<t:${String(Math.floor(lottery.nextDrawTime.getTime() / 1_000))}:R>` };

	if (winners.length === 0) {
		return embed({
			category: "economy",
			title: "🎟️ Lottery draw",
			description: "Nobody entered this round, so the prize pool rolls over.",
			fields: [{ ...nextDraw, inline: true }],
		});
	}

	const shared = winners.length === 1 ? "went to one winner" : `was shared between ${String(winners.length)} winners`;
	return embed({
		category: "economy",
		title: "🎟️ Lottery draw",
		description: `**${formatNumber(lottery.prizePool)}** ${shared}.`,
		fields: [
			{
				name: "Winners",
				value: winners.map((winner) => `<@${winner.userId}> — **${formatNumber(winner.prizeAmount)}**`).join("\n"),
			},
			{ name: "Tickets sold", value: formatNumber(tickets), inline: true },
			{ ...nextDraw, inline: true },
		],
	});
}

export async function runLotteryDraws(client: TestifyClient): Promise<void> {
	for (let processed = 0; processed < DRAWS_PER_RUN; processed += 1) {
		const lottery = await claimDueDraw();
		if (!lottery) return;

		const tickets = lottery.entries.flatMap((entry) => Array.from({ length: entry.tickets }, () => entry));
		const winners = tickets.length === 0 ? [] : pickWinners(lottery, tickets);
		for (const winner of winners) await adjustWallet(lottery.guildId, winner.userId, winner.prizeAmount);

		await recordDraw(lottery, {
			drawTime: new Date(),
			totalPrizePool: lottery.prizePool,
			totalTickets: tickets.length,
			winners,
		});

		const channel = await client.channels.fetch(lottery.announcementChannelId).catch(() => null);
		if (channel?.isTextBased() && channel.isSendable()) {
			await channel.send({ embeds: [drawEmbed(lottery, winners, tickets.length)] });
		}
	}
}
