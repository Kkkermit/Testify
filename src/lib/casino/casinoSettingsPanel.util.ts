import { ButtonStyle } from "discord.js";
import { customId } from "@core/button";
import { CASINO_SETTINGS_ID } from "@lib/casino/casino.constants";
import {
	CASINO_GAME_EMOJI,
	CASINO_GAME_LABELS,
	CASINO_GAMES,
	CASINO_LIMITS,
	limitsLine,
} from "@lib/casino/casinoSettings.util";
import { COINFLIP_RETURN, DICE_RETURNS } from "@lib/casino/chance.util";
import { HILO_EDGE } from "@lib/casino/hilo.util";
import { slotsReturnToPlayer } from "@lib/casino/slots.util";
import { button, row } from "@lib/discord/components.util";
import { container, containerMessage, divider, text } from "@lib/discord/containers.util";
import { type ContainerMessage, type ContainerPart } from "@lib/discord/discord.types";
import { type CasinoGame, type CasinoSettings } from "@testify/shared";

/** The casino's switch, its games and its limits, applied the moment each control is used. */

export function casinoSettingsPanel(settings: CasinoSettings, userId: string, note?: string): ContainerMessage {
	const parts: ContainerPart[] = [text("## 🎰 Casino settings")];
	if (note !== undefined) parts.push(text(`-# ${note}`));

	parts.push(
		text(
			settings.enabled
				? "**Open.** Anybody with an economy account can play with their wallet here."
				: "**Closed.** Every casino game is refused here until it is opened again. Hands already dealt can still finish.",
		),
		row(
			button({
				id: customId(CASINO_SETTINGS_ID, settings.enabled ? "close" : "open", userId),
				label: settings.enabled ? "Close the casino" : "Open the casino",
				emoji: settings.enabled ? "🚫" : "✅",
				style: settings.enabled ? ButtonStyle.Danger : ButtonStyle.Success,
			}),
		),
		divider(),
		text("### 🎲 Games\nPress a game to switch it on or off."),
	);

	const gameButton = (game: CasinoGame): ReturnType<typeof button> =>
		button({
			id: customId(CASINO_SETTINGS_ID, "game", game, userId),
			label: CASINO_GAME_LABELS[game],
			emoji: settings.games[game] ? CASINO_GAME_EMOJI[game] : "🚫",
			style: settings.games[game] ? ButtonStyle.Success : ButtonStyle.Secondary,
			disabled: !settings.enabled,
		});

	parts.push(
		row(...CASINO_GAMES.slice(0, 3).map(gameButton)),
		row(...CASINO_GAMES.slice(3).map(gameButton)),
		divider(),
		text(`### 💰 Bet limits\n${limitsLine(settings)}`),
		row(
			button({
				id: customId(CASINO_SETTINGS_ID, "limits", userId),
				label: "Change the limits",
				emoji: "✏️",
				style: ButtonStyle.Secondary,
			}),
		),
	);

	return containerMessage(container({ category: "casino", parts }));
}

/** Reads the limits form: a blank largest bet means no ceiling. */
export function parseLimits(
	min: string,
	max: string,
): { ok: true; minBet: number; maxBet: number | null } | { ok: false; reason: string } {
	const whole = (raw: string): number | null => {
		const value = Number(raw.trim().replace(/[,_\s]/g, ""));
		return Number.isInteger(value) && value >= CASINO_LIMITS.minBet && value <= CASINO_LIMITS.maxBet ? value : null;
	};
	const range = `a whole number from ${CASINO_LIMITS.minBet} to ${CASINO_LIMITS.maxBet.toLocaleString("en-GB")}`;

	const minBet = whole(min);
	if (minBet === null) return { ok: false, reason: `The smallest bet has to be ${range}.` };

	if (max.trim() === "") return { ok: true, minBet, maxBet: null };

	const maxBet = whole(max);
	if (maxBet === null) return { ok: false, reason: `The largest bet has to be ${range}, or left blank for no limit.` };

	return { ok: true, minBet, maxBet };
}

const percent = (fraction: number): string => `${(fraction * 100).toFixed(1)}%`;

/** What each game pays and keeps, so a player can see the odds before sitting down. */
export function casinoLobby(settings: CasinoSettings): ContainerMessage {
	const lines: Record<CasinoGame, string> = {
		roulette:
			"Single zero. A number pays 35 to 1, a dozen or column 2 to 1, red, black, odd, even, low and high evens.",
		blackjack: "Dealer stands on every 17. A natural pays 3 to 2, and you can double on your first two cards.",
		slots: `Three reels. Three diamonds pay 500×, and the machine returns ${percent(slotsReturnToPlayer())} over time.`,
		hilo: `Call the next card higher or lower. Each right call pays its odds less ${percent(1 - HILO_EDGE)}; cash out any time.`,
		coinflip: `Call it. A right call pays ${COINFLIP_RETURN}× your bet.`,
		dice: `Two dice. Under or over 7 pays ${DICE_RETURNS.under}×, exactly 7 pays ${DICE_RETURNS.seven}×.`,
	};

	const parts: ContainerPart[] = [
		text("## 🎰 The casino"),
		text(
			settings.enabled
				? "Every bet comes straight out of your wallet, and every win goes straight back in."
				: "**The casino is closed in this server.**",
		),
		divider(),
		...CASINO_GAMES.map((game) =>
			text(
				`**${CASINO_GAME_EMOJI[game]} ${CASINO_GAME_LABELS[game]}**${settings.games[game] ? "" : " · switched off here"}\n${lines[game]}`,
			),
		),
		divider(),
		text(limitsLine(settings)),
	];

	return containerMessage(container({ category: "casino", parts }));
}
