import {
	type ActionRowBuilder,
	type AttachmentBuilder,
	ButtonStyle,
	type Guild,
	type MessageActionRowComponentBuilder,
} from "discord.js";
import { theme } from "@config/theme";
import { customId } from "@core/button";
import { renderBoardImage } from "@lib/canvas/boardCard.util";
import { type BoardRow } from "@lib/canvas/canvas.types";
import { button, row } from "@lib/discord/components.util";
import { LEADERBOARD_ID } from "@lib/economy/economy.constants";
import { type BoardKind } from "@lib/economy/economy.types";
import {
	type BoardEntry,
	boardEntries,
	type BoardView,
	decorateRows,
	SERVER_TOTALS,
	standingOnBoard,
} from "@lib/economy/memberActions.util";
import { formatNumber, ordinal } from "@lib/format/format.util";
import { BOARD_SCOPES, type BoardScope, MONEY_SORT_LABELS, MONEY_SORTS, type MoneySort } from "@testify/shared";

/** The leaderboards as one picture: the top ten, the reader's own place, and buttons to change what is ranked. */

export const BOARD_SIZE = 10;

/** Which board, and for money, ranked by what and over which servers. */
export interface BoardState {
	kind: BoardKind;
	sort: MoneySort;
	scope: BoardScope;
}

export function boardTitle(state: BoardState): string {
	if (state.kind === "levels") return "Top levels";
	return state.sort === "total" ? "Richest members" : MONEY_SORT_LABELS[state.sort].heading;
}

export function boardSubtitle(state: BoardState, guildName: string): string {
	if (state.kind === "levels") return `${guildName} · Ranked by level`;

	const where = state.scope === "global" ? "Every server" : guildName;
	return `${where} · Ranked by ${state.sort === "total" ? "wallet and bank together" : state.sort}`;
}

export function emptyMessage(kind: BoardKind, scope: BoardScope = "server"): string {
	if (kind === "levels") return "Nobody has earned any XP here yet.";
	return scope === "global" ? "Nobody has an account anywhere yet." : "Nobody has an account here yet.";
}

export function unrankedMessage(kind: BoardKind): string {
	return kind === "levels"
		? "You are not on this board yet. Chat here to earn XP."
		: "You are not on this board yet. Open an account with /economy create.";
}

export function footerText(kind: BoardKind, scope: BoardScope, total: number): string {
	if (kind === "levels") return `${formatNumber(total)} ${total === 1 ? "member" : "members"} ranked`;
	if (scope === "global")
		return `${formatNumber(total)} ${total === 1 ? "person" : "people"} ranked across every server`;
	return `${formatNumber(total)} ${total === 1 ? "account" : "accounts"} ranked`;
}

function describe(kind: BoardKind, entry: BoardEntry, sort: MoneySort): Pick<BoardRow, "primary" | "secondary"> {
	if (kind === "levels") {
		return { primary: `Level ${formatNumber(entry.primary)}`, secondary: `${formatNumber(entry.secondary)} XP` };
	}

	return {
		primary: formatNumber(entry.primary),
		secondary: `${formatNumber(entry.secondary)} ${sort === "bank" ? "in wallet" : "banked"}`,
	};
}

const SCOPE_BUTTONS: Record<BoardScope, { label: string; emoji: string }> = {
	server: { label: "This server", emoji: "🏠" },
	global: { label: "Every server", emoji: "🌍" },
};

const SORT_BUTTONS: Record<MoneySort, { label: string; emoji: string }> = {
	total: { label: "Total", emoji: theme.emoji.coin },
	wallet: { label: "Wallet", emoji: theme.emoji.wallet },
	bank: { label: "Bank", emoji: theme.emoji.bank },
};

/** The money board's switches, each carrying the whole state it leads to; the levels board has none. */
export function boardControls(state: BoardState, userId: string): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
	if (state.kind === "levels") return [];

	const choice = (sort: MoneySort, scope: BoardScope, current: boolean, look: { label: string; emoji: string }) =>
		button({
			id: customId(LEADERBOARD_ID, "view", sort, scope, userId),
			label: look.label,
			emoji: look.emoji,
			// The board already showing is marked by being the one that cannot be pressed.
			style: current ? ButtonStyle.Primary : ButtonStyle.Secondary,
			disabled: current,
		});

	return [
		row(...BOARD_SCOPES.map((scope) => choice(state.sort, scope, scope === state.scope, SCOPE_BUTTONS[scope]))),
		row(...MONEY_SORTS.map((sort) => choice(sort, state.scope, sort === state.sort, SORT_BUTTONS[sort]))),
	];
}

export interface BoardMessage {
	files: AttachmentBuilder[];
	components: ActionRowBuilder<MessageActionRowComponentBuilder>[];
}

/** The picture's alt text, which is also everything a screen reader gets. */
export function boardDescription(state: BoardState, guildName: string, rank: number | null, total: number): string {
	const where = rank === null ? "You are not on it yet." : `You are ${ordinal(rank)} of ${formatNumber(total)}.`;
	return `${boardTitle(state)}, ${boardSubtitle(state, guildName)}. ${where}`;
}

/** One board; the bot-wide board adds up the servers in `guildIds`, which come from the client and never a request. */
export async function boardMessage(
	guild: Guild,
	state: BoardState,
	viewerId: string,
	guildIds: readonly string[],
): Promise<BoardMessage> {
	const view: BoardView = state.kind === "economy" ? { sort: state.sort, scope: state.scope, guildIds } : SERVER_TOTALS;
	const scope = view.scope;
	const [{ entries, total }, standing] = await Promise.all([
		boardEntries(guild.id, state.kind, { limit: BOARD_SIZE, skip: 0 }, view),
		standingOnBoard(guild.id, state.kind, viewerId, view),
	]);

	const decorated = await decorateRows(guild, entries, 1, scope);
	const rows: BoardRow[] = decorated.map((person, index) => ({
		rank: person.rank,
		displayName: person.displayName,
		avatarUrl: person.avatarUrl ?? "",
		...describe(state.kind, entries[index]!, state.sort),
		you: person.userId === viewerId,
	}));

	const onBoard = rows.some((entry) => entry.you === true);
	let viewer: BoardRow | null = null;
	if (standing !== null && !onBoard) {
		const [person] = await decorateRows(guild, [standing.entry], standing.rank, scope);
		if (person !== undefined) {
			viewer = {
				rank: standing.rank,
				displayName: person.displayName,
				avatarUrl: person.avatarUrl ?? "",
				...describe(state.kind, standing.entry, state.sort),
				you: true,
			};
		}
	}

	const image = await renderBoardImage({
		theme: state.kind === "levels" ? "levels" : "money",
		title: boardTitle(state),
		subtitle: boardSubtitle(state, guild.name),
		rows,
		viewer,
		// An empty board already says nobody is on it, so it does not say it twice.
		unranked: standing === null && rows.length > 0 ? unrankedMessage(state.kind) : null,
		empty: emptyMessage(state.kind, scope),
		footer: footerText(state.kind, scope, total),
	});
	image.setDescription(boardDescription(state, guild.name, standing?.rank ?? null, total));

	return { files: [image], components: boardControls(state, viewerId) };
}
