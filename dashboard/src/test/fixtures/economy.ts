import { type CasinoSettings, type LotterySettings, type TreasureSettings } from "@testify/shared";

/** Typed against the shared contract, so a fixture cannot drift from what the API actually returns. */

export const lotterySettings: LotterySettings = {
	enabled: true,
	frozen: false,
	entryFee: 100,
	basePrizePool: 500,
	maxWinners: 2,
	frequency: "weekly",
	announcementChannelId: "400000000000000001",
	prizePool: 2500,
	ticketsSold: 20,
	entrants: 7,
	nextDrawAt: "2026-08-14T12:00:00.000Z",
	history: [
		{
			at: "2026-08-07T12:00:00.000Z",
			prizePool: 1800,
			tickets: 12,
			winners: [{ userTag: "kate", prizeAmount: 1800 }],
		},
	],
};

export const treasureSettings: TreasureSettings = {
	enabled: true,
	minMessages: 15,
	maxMessages: 50,
	minAmount: 10,
	maxAmount: 500,
	cooldownMs: 300_000,
	configured: true,
};

export const casinoSettings: CasinoSettings = {
	enabled: true,
	games: { roulette: true, blackjack: true, slots: false, hilo: true, coinflip: true, dice: true },
	minBet: 10,
	maxBet: null,
	configured: true,
};
