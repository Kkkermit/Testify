import { type EmbedBuilder } from "discord.js";
import { type CasinoStandout, type CasinoStatsReport } from "@database/repositories/casinoStatsRepository";
import { CASINO_GAME_EMOJI, CASINO_GAME_LABELS } from "@lib/casino/casinoSettings.util";
import { embed } from "@lib/discord/embeds.util";
import { discordTime, formatNumber } from "@lib/format/format.util";
import { CASINO_GAMES, type CasinoGame } from "@testify/shared";

/** The `/casino stats` card: a server's whole casino, or one game in it, with the reader's own record. */

interface Sums {
	plays: number;
	wagered: number;
	returned: number;
	wins: number;
	losses: number;
	pushes: number;
}

/** One decimal place, and never a division by nothing. */
export function percent(part: number, whole: number): string {
	return whole === 0 ? "0%" : `${(Math.round((part / whole) * 1_000) / 10).toLocaleString("en-GB")}%`;
}

function signed(amount: number): string {
	return amount >= 0 ? `+${formatNumber(amount)}` : `−${formatNumber(-amount)}`;
}

/** What the house kept, or how far ahead the players are when it kept nothing. */
export function houseLine(sums: Pick<Sums, "wagered" | "returned">): string {
	const take = sums.wagered - sums.returned;
	if (take >= 0) return `**${formatNumber(take)}** · ${percent(take, sums.wagered)} of every bet`;
	return `**${signed(take)}** · the players are ahead`;
}

function winRate(sums: Sums): string {
	return (
		`**${percent(sums.wins, sums.plays)}**\n` +
		`-# ${formatNumber(sums.wins)} won · ${formatNumber(sums.pushes)} even · ${formatNumber(sums.losses)} lost`
	);
}

function gameName(game: CasinoGame): string {
	return `${CASINO_GAME_EMOJI[game]} ${CASINO_GAME_LABELS[game]}`;
}

function who(standout: CasinoStandout | null, show: (amount: number) => string, game: boolean): string {
	if (standout === null) return "*Nobody yet*";
	const where = game && standout.game !== undefined ? ` at ${CASINO_GAME_LABELS[standout.game]}` : "";
	return `${show(standout.amount)} by <@${standout.userId}>${where}`;
}

function gameRow(row: CasinoStatsReport["byGame"][number]): string {
	return (
		`${gameName(row.game)} · **${formatNumber(row.plays)}** ${row.plays === 1 ? "play" : "plays"} · ` +
		`${formatNumber(row.wagered)} bet · house ${signed(row.wagered - row.returned)} · ${percent(row.wins, row.plays)} won`
	);
}

function mineLine(mine: CasinoStatsReport["mine"]): string {
	if (mine === null) return "You have not played here yet.";
	return (
		`**${formatNumber(mine.plays)}** ${mine.plays === 1 ? "play" : "plays"} · ${formatNumber(mine.wagered)} bet · ` +
		`**${signed(mine.returned - mine.wagered)}** overall · ${percent(mine.wins, mine.plays)} won`
	);
}

export function casinoStatsEmbed(
	report: CasinoStatsReport,
	options: { game: CasinoGame | null; guildName: string },
): EmbedBuilder {
	const { game } = options;
	const title = game === null ? "🎰 Casino stats" : `${gameName(game)} stats`;
	const { totals } = report;

	if (totals.plays === 0) {
		const what = game === null ? "the casino" : CASINO_GAME_LABELS[game];
		return embed({
			category: "casino",
			title,
			description: `Nobody has played ${what} in **${options.guildName}** yet. Every game from now on is counted here.`,
		});
	}

	const fields = [
		{
			name: "🎲 Games played",
			value: `**${formatNumber(totals.plays)}**\n-# by ${formatNumber(totals.players)} ${totals.players === 1 ? "player" : "players"}`,
			inline: true,
		},
		{ name: "💰 Wagered", value: `**${formatNumber(totals.wagered)}**`, inline: true },
		{ name: "🏦 Paid out", value: `**${formatNumber(totals.returned)}**`, inline: true },
		{ name: "🏠 House take", value: houseLine(totals), inline: true },
		{ name: "📈 Win rate", value: winRate(totals), inline: true },
		{ name: "🔁 Paid back", value: `**${percent(totals.returned, totals.wagered)}** of every coin bet`, inline: true },
		{
			name: "🏆 Biggest win",
			value: who(report.biggestWin, (amount) => `**${formatNumber(amount)}**`, game === null),
			inline: true,
		},
		{
			name: "💎 Biggest bet",
			value: who(report.biggestBet, (amount) => `**${formatNumber(amount)}**`, game === null),
			inline: true,
		},
		{ name: "​", value: "​", inline: true },
		{
			name: "🍀 Furthest ahead",
			value: who(report.topWinner, (amount) => `**${signed(amount)}**`, false),
			inline: true,
		},
		{
			name: "💸 Furthest behind",
			value: who(report.topLoser, (amount) => `**${signed(amount)}**`, false),
			inline: true,
		},
		{ name: "​", value: "​", inline: true },
	];

	if (game === null) {
		const played = new Set(report.byGame.map((row) => row.game));
		const unplayed = CASINO_GAMES.filter((each) => !played.has(each)).map((each) => CASINO_GAME_LABELS[each]);
		fields.push({
			name: "🎮 By game",
			value:
				report.byGame.map(gameRow).join("\n") +
				(unplayed.length === 0 ? "" : `\n-# Not played yet: ${unplayed.join(", ")}`),
			inline: false,
		});
	}
	fields.push({ name: "🙋 Your record", value: mineLine(report.mine), inline: false });

	const since = totals.since === null ? "" : ` since ${discordTime(totals.since.getTime(), "D")}`;
	return embed({
		category: "casino",
		title,
		description: `Everything played at **${options.guildName}**'s ${game === null ? "casino" : "table"}${since}.`,
		fields,
	});
}
