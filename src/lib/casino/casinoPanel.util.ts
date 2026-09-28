import { AttachmentBuilder, ButtonStyle, type ColorResolvable } from "discord.js";
import { theme } from "@config/theme";
import { customId } from "@core/button";
import { blackjackTable, hiloTable, type TableBanner } from "@lib/canvas/cardTable.util";
import { canDouble, handValue } from "@lib/casino/blackjack.util";
import { cardLabel } from "@lib/casino/cards.util";
import { CASINO_ID, CASINO_TIMING } from "@lib/casino/casino.constants";
import { type BlackjackState, type BlackjackVerdict, type HiLoState } from "@lib/casino/casino.types";
import { CASINO_GAME_EMOJI, CASINO_GAME_LABELS } from "@lib/casino/casinoSettings.util";
import { hiloPayout, hiloStep } from "@lib/casino/hilo.util";
import { type InstantOutcome } from "@lib/casino/instantGames.util";
import { button, row } from "@lib/discord/components.util";
import { container, containerMessage, divider, gallery, text } from "@lib/discord/containers.util";
import { type ContainerMessageWithFiles, type ContainerPart } from "@lib/discord/discord.types";
import { formatDurationLong, formatNumber } from "@lib/format/format.util";
import { type CasinoGame } from "@testify/shared";

/** Every casino message, as pure functions of the game's state, so the first render and every update match. */

type ResultTone = "win" | "even" | "lose";

const TONE_COLOUR: Record<ResultTone, ColorResolvable> = {
	win: theme.colours.success,
	even: theme.colours.warning,
	lose: theme.colours.error,
};

function withFile(
	parts: ContainerPart[],
	file: AttachmentBuilder | AttachmentBuilder[],
	tone?: ResultTone,
): ContainerMessageWithFiles {
	const box = container({ category: "casino", ...(tone === undefined ? {} : { accent: TONE_COLOUR[tone] }), parts });

	// An empty list drops the pictures the message carried before, so an edit never keeps a stale one.
	return { ...containerMessage(box), files: Array.isArray(file) ? file : [file], attachments: [] };
}

function heading(game: CasinoGame): string {
	return `## ${CASINO_GAME_EMOJI[game]} ${CASINO_GAME_LABELS[game]}`;
}

/** The game's name beside the bet, small, once the headline has taken the top of a settled message. */
function gameLine(game: CasinoGame, bet: string): string {
	return `${CASINO_GAME_EMOJI[game]} **${CASINO_GAME_LABELS[game]}** · ${bet}`;
}

export function resultTone(staked: number, returned: number): ResultTone {
	if (returned > staked) return "win";
	return returned === staked ? "even" : "lose";
}

/** The first thing a settled message says, in the largest type Discord has. */
export function resultHeadline(staked: number, returned: number): string {
	switch (resultTone(staked, returned)) {
		case "win":
			return `# ${theme.emoji.confetti} Congratulations, you won ${formatNumber(returned - staked)}!`;
		case "even":
			return `# 🤝 Your ${formatNumber(staked)} came back`;
		case "lose":
			return `# 💸 You lost ${formatNumber(staked - returned)}`;
	}
}

/** The arithmetic behind the headline, or nothing when the whole bet went. */
export function payoutLine(staked: number, returned: number): string | null {
	if (returned === 0 || returned === staked) return null;
	if (returned < staked) return `**${formatNumber(returned)}** of your **${formatNumber(staked)}** came back.`;

	return `**${formatNumber(returned)}** paid on a **${formatNumber(staked)}** bet.`;
}

function detail(line: string, staked: number, returned: number): string {
	const payout = payoutLine(staked, returned);
	return payout === null ? line : `${line}\n${payout}`;
}

function walletLine(wallet: number | null): string | null {
	return wallet === null ? null : `-# Wallet: ${formatNumber(wallet)}`;
}

function againRow(game: CasinoGame, call: string, stake: number, userId: string): ContainerPart {
	return row(
		button({
			id: customId(CASINO_ID, "again", game, call, String(stake), userId),
			label: `Play again · ${formatNumber(stake)}`,
			emoji: CASINO_GAME_EMOJI[game],
			style: ButtonStyle.Primary,
		}),
	);
}

export function instantSpinningMessage(outcome: InstantOutcome, stake: number, gif: Buffer): ContainerMessageWithFiles {
	const file = new AttachmentBuilder(gif, { name: `${outcome.file}.gif` });

	return withFile(
		[
			text(heading(outcome.game)),
			text(`Bet **${formatNumber(stake)}** on **${outcome.betLine}**`),
			gallery(`attachment://${outcome.file}.gif`),
			text("-# Good luck…"),
		],
		file,
	);
}

export function instantSettledMessage(
	outcome: InstantOutcome,
	stake: number,
	wallet: number | null,
	userId: string,
	still: Buffer,
): ContainerMessageWithFiles {
	const files = [new AttachmentBuilder(still, { name: `${outcome.file}.png` })];
	const parts: ContainerPart[] = [
		text(resultHeadline(stake, outcome.returned)),
		text(gameLine(outcome.game, `Bet **${formatNumber(stake)}** on **${outcome.betLine}**`)),
		gallery(`attachment://${outcome.file}.png`),
	];

	parts.push(text(detail(outcome.result, stake, outcome.returned)));
	const walletText = walletLine(wallet);
	if (walletText !== null) parts.push(text(walletText));
	parts.push(againRow(outcome.game, outcome.again, stake, userId));

	return withFile(parts, files, resultTone(stake, outcome.returned));
}

const VERDICT_TEXT: Record<BlackjackVerdict, string> = {
	blackjack: "**Blackjack!** A natural pays 3 to 2.",
	win: "**You win.**",
	push: "**Push.** Neither hand beats the other.",
	lose: "**The dealer wins.**",
	bust: "**Bust.** Over 21.",
	"dealer-blackjack": "**The dealer has blackjack.**",
};

const VERDICT_BANNER: Record<BlackjackVerdict, TableBanner> = {
	blackjack: { text: "Blackjack!", tone: "win" },
	win: { text: "You win", tone: "win" },
	push: { text: "Push", tone: "push" },
	lose: { text: "Dealer wins", tone: "lose" },
	bust: { text: "Bust", tone: "lose" },
	"dealer-blackjack": { text: "Dealer blackjack", tone: "lose" },
};

export interface BlackjackView {
	state: BlackjackState;
	bet: number;
	staked: number;
	/** Null while the player is still deciding. */
	verdict: BlackjackVerdict | null;
	returned: number;
	wallet: number | null;
	/** True when the hand was played out for an idle player. */
	auto?: boolean;
}

export function blackjackMessage(view: BlackjackView, userId: string): ContainerMessageWithFiles {
	const playing = view.verdict === null;
	const image = blackjackTable({
		dealer: view.state.dealer,
		player: view.state.player,
		hideHole: playing,
		dealerTotal: String(handValue(playing ? view.state.dealer.slice(0, 1) : view.state.dealer)),
		playerTotal: String(handValue(view.state.player)),
		...(view.verdict === null ? {} : { banner: VERDICT_BANNER[view.verdict] }),
	});

	const bet = view.state.doubled
		? `Bet **${formatNumber(view.bet)}**, doubled to **${formatNumber(view.staked)}**`
		: `Bet **${formatNumber(view.staked)}**`;
	const parts: ContainerPart[] = [
		...(view.verdict === null
			? [text(heading("blackjack")), text(bet)]
			: [text(resultHeadline(view.staked, view.returned)), text(gameLine("blackjack", bet))]),
		gallery("attachment://blackjack.png", `You hold ${view.state.player.map(cardLabel).join(" ")}.`),
	];

	if (view.verdict === null) {
		parts.push(
			row(
				button({ id: customId(CASINO_ID, "bj-hit", userId), label: "Hit", style: ButtonStyle.Primary }),
				button({ id: customId(CASINO_ID, "bj-stand", userId), label: "Stand", style: ButtonStyle.Secondary }),
				button({
					id: customId(CASINO_ID, "bj-double", userId),
					label: `Double · ${formatNumber(view.bet)}`,
					style: ButtonStyle.Success,
					disabled: !canDouble(view.state),
				}),
			),
			text(
				`-# Left alone for ${formatDurationLong(CASINO_TIMING.handIdleMs)}, the hand stands on its own and is paid.`,
			),
		);
	} else {
		parts.push(divider(), text(detail(VERDICT_TEXT[view.verdict], view.staked, view.returned)));
		if (view.auto === true) parts.push(text("-# You left the hand alone, so it stood for you."));
		const walletText = walletLine(view.wallet);
		if (walletText !== null) parts.push(text(walletText));
		parts.push(againRow("blackjack", "deal", view.bet, userId));
	}

	return withFile(
		parts,
		new AttachmentBuilder(image, { name: "blackjack.png" }),
		view.verdict === null ? undefined : resultTone(view.staked, view.returned),
	);
}

export interface HiLoView {
	state: HiLoState;
	staked: number;
	/** `open` while the player can still call. */
	phase: "open" | "lost" | "cashed";
	returned: number;
	wallet: number | null;
	/** Whether the last call was right, for the banner; null before the first. */
	lastCall: boolean | null;
	auto?: boolean;
}

function stepLabel(step: number | null): string {
	return step === null ? "—" : `×${step.toFixed(2)}`;
}

export function hiloMessage(view: HiLoView, userId: string): ContainerMessageWithFiles {
	const pot = hiloPayout(view.state, view.staked);
	const banner: TableBanner | undefined =
		view.phase === "lost"
			? { text: "Wrong call", tone: "lose" }
			: view.phase === "cashed"
				? { text: `Cashed out ${formatNumber(view.returned)}`, tone: "win" }
				: view.lastCall === true
					? { text: "Correct!", tone: "win" }
					: undefined;

	const image = hiloTable({
		current: view.state.current,
		history: view.state.history,
		multiplier: view.state.multiplier,
		...(banner === undefined ? {} : { banner }),
	});

	const open = view.phase === "open";
	const returned = view.phase === "lost" ? 0 : view.returned;
	const parts: ContainerPart[] = [
		...(open
			? [text(heading("hilo")), text(`Bet **${formatNumber(view.staked)}** · Pot **${formatNumber(pot)}**`)]
			: [text(resultHeadline(view.staked, returned)), text(gameLine("hilo", `Bet **${formatNumber(view.staked)}**`))]),
		gallery("attachment://hilo.png", `The card showing is ${cardLabel(view.state.current)}.`),
	];

	if (open) {
		const higher = hiloStep(view.state.current, "higher");
		const lower = hiloStep(view.state.current, "lower");

		parts.push(
			text("Will the next card be **higher** or **lower**? A tie loses, and aces are high."),
			row(
				button({
					id: customId(CASINO_ID, "hl-higher", userId),
					label: `Higher ${stepLabel(higher)}`,
					emoji: "⬆️",
					style: ButtonStyle.Primary,
					disabled: higher === null,
				}),
				button({
					id: customId(CASINO_ID, "hl-lower", userId),
					label: `Lower ${stepLabel(lower)}`,
					emoji: "⬇️",
					style: ButtonStyle.Primary,
					disabled: lower === null,
				}),
				button({
					id: customId(CASINO_ID, "hl-cash", userId),
					label: `Cash out · ${formatNumber(pot)}`,
					emoji: "💰",
					style: ButtonStyle.Success,
				}),
			),
			text(`-# Left alone for ${formatDurationLong(CASINO_TIMING.handIdleMs)}, the pot is cashed out for you.`),
		);
	} else {
		parts.push(
			divider(),
			text(
				view.phase === "lost"
					? `The next card was **${cardLabel(view.state.current)}**. The pot is gone.`
					: detail(
							`You cashed out after **${view.state.rounds}** ${view.state.rounds === 1 ? "call" : "calls"}.`,
							view.staked,
							view.returned,
						),
			),
		);
		if (view.auto === true) parts.push(text("-# You left the table, so the pot was cashed out for you."));
		const walletText = walletLine(view.wallet);
		if (walletText !== null) parts.push(text(walletText));
		parts.push(againRow("hilo", "deal", view.staked, userId));
	}

	return withFile(
		parts,
		new AttachmentBuilder(image, { name: "hilo.png" }),
		open ? undefined : resultTone(view.staked, returned),
	);
}
