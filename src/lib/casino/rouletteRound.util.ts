import { AttachmentBuilder, ButtonStyle } from "discord.js";
import { customId } from "@core/button";
import { type RoundRecord } from "@database/repositories/rouletteRepository";
import { type BoardChip, rouletteBoard } from "@lib/canvas/rouletteTable.util";
import { ROULETTE_ID, ROULETTE_ROUND, SEAT_COLOURS } from "@lib/casino/casino.constants";
import { type RouletteBet } from "@lib/casino/casino.types";
import { CASINO_GAME_EMOJI } from "@lib/casino/casinoSettings.util";
import { betWins, pocketColour, ROULETTE_SPOTS, rouletteReturn, spotFromKey, spotKey } from "@lib/casino/roulette.util";
import { button, row } from "@lib/discord/components.util";
import { container, containerMessage, gallery, text } from "@lib/discord/containers.util";
import { type ContainerMessageWithFiles, type ContainerPart } from "@lib/discord/discord.types";
import { discordTime, escapeMarkdown, formatNumber } from "@lib/format/format.util";

/** A shared round of roulette as pure state: who sits where, what they bet, and every message the round shows. */

export interface RoundBet {
	bet: RouletteBet;
	amount: number;
}

export interface RoundPlayer {
	userId: string;
	name: string;
	/** Their place in the order they sat down, which picks their chip colour. */
	seat: number;
	chip: number;
	bets: RoundBet[];
}

export interface RoundView {
	id: string;
	hostId: string;
	hostName: string;
	/** Only the host may bet at a private table. */
	private: boolean;
	/** The chip a newcomer starts with, and the one Play again carries on. */
	chip: number;
	/** Null until the first bet, which starts the countdown. */
	closesAt: number | null;
	pocket: number | null;
	players: RoundPlayer[];
}

export interface PlayerResult {
	player: RoundPlayer;
	staked: number;
	returned: number;
}

export function roundView(record: RoundRecord): RoundView {
	const players = Object.entries(record.players)
		.sort(([, a], [, b]) => a.joinedAt - b.joinedAt)
		.map(([userId, seat], index): RoundPlayer => ({
			userId,
			name: seat.name,
			seat: index,
			chip: seat.chip ?? record.chip,
			bets: seat.bets.flatMap((stored) => {
				const bet = spotFromKey(stored.spot);
				return bet === null ? [] : [{ bet, amount: stored.amount }];
			}),
		}));

	return {
		id: String(record._id),
		hostId: record.hostId,
		hostName: record.hostName ?? "",
		private: record.private === true,
		chip: record.chip,
		closesAt: record.closesAt === null ? null : new Date(record.closesAt).getTime(),
		pocket: record.pocket,
		players,
	};
}

export function roundChips(view: RoundView): BoardChip[] {
	return view.players.flatMap((player) => player.bets.map((placed) => ({ ...placed, seat: player.seat })));
}

export function staked(player: RoundPlayer): number {
	return player.bets.reduce((sum, placed) => sum + placed.amount, 0);
}

/** Each winning bet hands back its own amount times its return; players with nothing on the table are left out. */
export function roundResults(view: RoundView, pocket: number): PlayerResult[] {
	return view.players
		.filter((player) => player.bets.length > 0)
		.map((player) => ({
			player,
			staked: staked(player),
			returned: player.bets
				.filter((placed) => betWins(placed.bet, pocket))
				.reduce((sum, placed) => sum + placed.amount * rouletteReturn(placed.bet.kind), 0),
		}));
}

/** Reads "7", "7, 17 32" or "0 and 36"; null when nothing, or anything that is not a number on the wheel, was given. */
export function parseNumbers(raw: string): number[] | null {
	const parts = raw.split(/[\s,;/]+|\band\b/i).filter((part) => part !== "");
	if (parts.length === 0) return null;

	const numbers: number[] = [];
	for (const part of parts) {
		if (!/^\d{1,2}$/.test(part)) return null;
		const number = Number.parseInt(part, 10);
		if (number > 36) return null;
		if (!numbers.includes(number)) numbers.push(number);
	}
	return numbers;
}

function seatEmoji(seat: number): string {
	return SEAT_COLOURS[seat % SEAT_COLOURS.length]!.emoji;
}

function betName(bet: RouletteBet): string {
	switch (bet.kind) {
		case "number":
			return String(bet.number ?? 0);
		case "red":
			return "Red";
		case "black":
			return "Black";
		case "odd":
			return "Odd";
		case "even":
			return "Even";
		case "low":
			return "1–18";
		case "high":
			return "19–36";
		case "dozen1":
			return "1st 12";
		case "dozen2":
			return "2nd 12";
		case "dozen3":
			return "3rd 12";
		case "column1":
			return "Col 1";
		case "column2":
			return "Col 2";
		case "column3":
			return "Col 3";
	}
}

function playerLine(player: RoundPlayer): string {
	const spots = player.bets.map((placed) => betName(placed.bet)).join(", ");
	return (
		`${seatEmoji(player.seat)} **${escapeMarkdown(player.name)}** · ${String(player.bets.length)}/${String(ROULETTE_ROUND.maxBets)} ` +
		`bets · **${formatNumber(staked(player))}** — ${spots}`
	);
}

function playersText(view: RoundView): string {
	const betting = view.players.filter((player) => player.bets.length > 0);
	return betting.length === 0 ? "*No bets yet. Be the first to put a chip down.*" : betting.map(playerLine).join("\n");
}

/** Says who may bet, so a reader knows whether the buttons are for them. */
export function accessLine(view: RoundView): string {
	if (!view.private) return "🌐 **Public table** · anybody in the channel can join";
	const host = view.hostName === "" ? "the host" : `**${escapeMarkdown(view.hostName)}**`;
	return `🔒 **Private table** · only ${host} can bet`;
}

function tableTotal(view: RoundView): number {
	return view.players.reduce((sum, player) => sum + staked(player), 0);
}

const BET_ROWS: readonly (readonly { bet: RouletteBet; style: ButtonStyle }[])[] = [
	[
		{ bet: { kind: "red" }, style: ButtonStyle.Danger },
		{ bet: { kind: "black" }, style: ButtonStyle.Secondary },
		{ bet: { kind: "odd" }, style: ButtonStyle.Primary },
		{ bet: { kind: "even" }, style: ButtonStyle.Primary },
	],
	[
		{ bet: { kind: "low" }, style: ButtonStyle.Primary },
		{ bet: { kind: "high" }, style: ButtonStyle.Primary },
		{ bet: { kind: "dozen1" }, style: ButtonStyle.Secondary },
		{ bet: { kind: "dozen2" }, style: ButtonStyle.Secondary },
		{ bet: { kind: "dozen3" }, style: ButtonStyle.Secondary },
	],
	[
		{ bet: { kind: "column1" }, style: ButtonStyle.Secondary },
		{ bet: { kind: "column2" }, style: ButtonStyle.Secondary },
		{ bet: { kind: "column3" }, style: ButtonStyle.Secondary },
	],
];

/** What a player hears after choosing a chip, so they know what their wallet covers before they bet. */
export function chipChosenLine(chip: number, wallet: number): string {
	const chips = Math.floor(wallet / chip);
	return (
		`Your chips are now worth **${formatNumber(chip)}** each on this round. ` +
		`You have **${formatNumber(wallet)}** in your wallet, enough for **${formatNumber(chips)}** ` +
		`${chips === 1 ? "chip" : "chips"}.`
	);
}

function betButton(roundId: string, bet: RouletteBet, style: ButtonStyle) {
	return button({ id: customId(ROULETTE_ID, "bet", roundId, spotKey(bet)), label: betName(bet), style });
}

function boardFile(view: RoundView, pocket?: number): AttachmentBuilder {
	const image = rouletteBoard({ chips: roundChips(view), ...(pocket === undefined ? {} : { pocket }) });
	return new AttachmentBuilder(image, { name: "roulette-table.png" });
}

function finish(parts: ContainerPart[], files: AttachmentBuilder[]): ContainerMessageWithFiles {
	// An empty list drops the pictures the message carried before, so an edit never keeps a stale one.
	return { ...containerMessage(container({ category: "casino", parts })), files, attachments: [] };
}

/** The open table: a countdown the reader's own client keeps live, the board with every chip, and a button per bet. */
export function roundBettingMessage(view: RoundView): ContainerMessageWithFiles {
	const [outside, bands, columns] = BET_ROWS;
	const total = tableTotal(view);

	const parts: ContainerPart[] = [
		text(`## ${CASINO_GAME_EMOJI.roulette} Place your bets!\n${accessLine(view)}`),
		text(
			(view.closesAt === null
				? `Waiting for the first bet. The wheel spins ${String(ROULETTE_ROUND.bettingMs / 1_000)} seconds after it lands.`
				: `The wheel spins ${discordTime(view.closesAt, "R")}. **${formatNumber(total)}** on the table.`) +
				(view.private ? " The host can press **Spin now** once a chip is down." : ""),
		),
		gallery("attachment://roulette-table.png", "The roulette table, with every chip placed so far."),
		text(playersText(view)),
		row(
			...outside!.map((choice) => betButton(view.id, choice.bet, choice.style)),
			button({ id: customId(ROULETTE_ID, "num", view.id), label: "Number…", emoji: "🎯", style: ButtonStyle.Success }),
		),
		row(...bands!.map((choice) => betButton(view.id, choice.bet, choice.style))),
		row(
			...columns!.map((choice) => betButton(view.id, choice.bet, choice.style)),
			button({
				id: customId(ROULETTE_ID, "chip", view.id),
				label: "Other…",
				emoji: "🪙",
				style: ButtonStyle.Secondary,
			}),
			button({ id: customId(ROULETTE_ID, "clear", view.id), label: "Clear mine", style: ButtonStyle.Danger }),
		),
		row(
			...ROULETTE_ROUND.chips.map((amount) =>
				button({
					id: customId(ROULETTE_ID, "chipto", view.id, String(amount)),
					label: formatNumber(amount),
					emoji: "🪙",
					style: ButtonStyle.Secondary,
				}),
			),
		),
		...(view.private
			? [
					row(
						button({
							id: customId(ROULETTE_ID, "spin", view.id),
							label: "Spin now",
							emoji: CASINO_GAME_EMOJI.roulette,
							style: ButtonStyle.Success,
							disabled: roundChips(view).length === 0,
						}),
					),
				]
			: []),
		text(
			`-# Each press puts one chip down, **${formatNumber(view.chip)}** unless you pick another size with the 🪙 ` +
				`buttons, and takes it from your wallet as it lands. Up to ${String(ROULETTE_ROUND.maxBets)} bets each. ` +
				"A number pays 35 to 1, a dozen or column 2 to 1, the rest evens.",
		),
	];

	return finish(parts, [boardFile(view)]);
}

/** No more bets: the wheel turning over the table as it stood when betting closed. */
export function roundSpinningMessage(view: RoundView, gif: Buffer): ContainerMessageWithFiles {
	const parts: ContainerPart[] = [
		text(`## ${CASINO_GAME_EMOJI.roulette} No more bets!\n${accessLine(view)}`),
		gallery("attachment://roulette.gif", "The wheel spinning."),
		gallery("attachment://roulette-table.png", "The table as betting closed."),
		text(playersText(view)),
		text("-# The ball is rolling…"),
	];

	return finish(parts, [new AttachmentBuilder(gif, { name: "roulette.gif" }), boardFile(view)]);
}

/** Every outside bet a pocket pays, so the headline says what won as well as the number. */
export function winningSpots(pocket: number): string[] {
	return ROULETTE_SPOTS.filter((spot) => spot.kind !== "number" && betWins(spot, pocket)).map(betName);
}

/** One entry per spot a player covered, chips on the same spot added together. */
function betLines(player: RoundPlayer, pocket: number): string {
	const spots = new Map<string, { bet: RouletteBet; amount: number }>();
	for (const placed of player.bets) {
		const key = spotKey(placed.bet);
		const found = spots.get(key);
		spots.set(key, { bet: placed.bet, amount: (found?.amount ?? 0) + placed.amount });
	}

	return [...spots.values()]
		.map(({ bet, amount }) =>
			betWins(bet, pocket)
				? `✅ ${betName(bet)}: ${formatNumber(amount)} → ${formatNumber(amount * rouletteReturn(bet.kind))}`
				: `❌ ${betName(bet)}: ${formatNumber(amount)}`,
		)
		.join(" · ");
}

function net(result: PlayerResult): string {
	const profit = result.returned - result.staked;
	if (profit > 0) return `**+${formatNumber(profit)}** 🎉`;
	if (profit === 0) return "broke even";
	return `**−${formatNumber(-profit)}** overall`;
}

function resultLine(result: PlayerResult, pocket: number): string {
	const { player } = result;
	const name = `${seatEmoji(player.seat)} **${escapeMarkdown(player.name)}**`;
	const summary =
		result.returned === 0
			? `${name} · bet **${formatNumber(result.staked)}** · lost it`
			: `${name} · bet **${formatNumber(result.staked)}** · won **${formatNumber(result.returned)}** · ${net(result)}`;
	return `${summary}\n-# ${betLines(player, pocket)}`;
}

/** Keeps a list inside one text block, naming how many were left off rather than failing the message. */
function fitted(heading: string, lines: string[], limit = 3_900): string {
	let body = heading;
	for (const [index, line] of lines.entries()) {
		const rest = lines.length - index;
		if (body.length + line.length + 1 > limit - 40) return `${body}\n-# …and ${String(rest)} more`;
		body += `\n${line}`;
	}
	return body;
}

/** Winners first, biggest profit on top, then everybody the wheel went against. */
export function resultsText(view: RoundView, pocket: number): string[] {
	const results = roundResults(view, pocket);
	const winners = results
		.filter((result) => result.returned > 0)
		.sort((a, b) => b.returned - b.staked - (a.returned - a.staked));
	const losers = results.filter((result) => result.returned === 0).sort((a, b) => b.staked - a.staked);

	const blocks: string[] = [];
	if (winners.length > 0) {
		blocks.push(
			fitted(
				`### 🏆 Winners`,
				winners.map((result) => resultLine(result, pocket)),
			),
		);
	} else {
		blocks.push("### 🏆 Winners\n*Nobody this time. The house takes the table.*");
	}
	if (losers.length > 0) {
		blocks.push(
			fitted(
				`### 💸 No luck`,
				losers.map((result) => resultLine(result, pocket)),
			),
		);
	}

	const paid = results.reduce((sum, result) => sum + result.returned, 0);
	const players = results.length === 1 ? "1 player" : `${String(results.length)} players`;
	blocks.push(
		`-# ${accessLine(view)} · ${players} · ${formatNumber(tableTotal(view))} on the table · ` +
			`${formatNumber(paid)} paid out. Winnings are already in your wallet.`,
	);
	return blocks;
}

/** A private table's New round stays private and stays with its host; a public one is open to whoever presses. */
export function playAgainRow(view: Pick<RoundView, "chip" | "private" | "hostId">): ContainerPart {
	return row(
		button({
			id: view.private
				? customId(ROULETTE_ID, "again", String(view.chip), "private", view.hostId)
				: customId(ROULETTE_ID, "again", String(view.chip), "public"),
			label: `New round · ${formatNumber(view.chip)} chip`,
			emoji: CASINO_GAME_EMOJI.roulette,
			style: ButtonStyle.Primary,
		}),
	);
}

/** Where the ball landed, the table with its winners picked out, what each player got, and a new round. */
export function roundSettledMessage(view: RoundView, still: Buffer | null): ContainerMessageWithFiles {
	const { pocket } = view;
	if (pocket === null || roundChips(view).length === 0) {
		return finish(
			[
				text(`## ${CASINO_GAME_EMOJI.roulette} Roulette\n${accessLine(view)}`),
				text("Nobody placed a bet before the wheel was due, so it did not spin."),
				playAgainRow(view),
			],
			[],
		);
	}

	const files = [boardFile(view, pocket)];
	const also = winningSpots(pocket);
	const parts: ContainerPart[] = [
		text(
			`# 🎯 ${String(pocket)} ${pocketColour(pocket)}` +
				(also.length === 0 ? "\n-# Zero: only a chip on 0 pays." : `\n-# Also paid: ${also.join(" · ")}`),
		),
	];
	if (still !== null) {
		files.unshift(new AttachmentBuilder(still, { name: "roulette.png" }));
		parts.push(gallery("attachment://roulette.png", `The ball landed on ${String(pocket)}.`));
	}
	parts.push(
		gallery("attachment://roulette-table.png", "The table, with the winning chips ringed in gold."),
		...resultsText(view, pocket).map((block) => text(block)),
		playAgainRow(view),
	);

	return finish(parts, files);
}
