import { LIMITS } from "../config/constants";

/**
 * One namespace registry, one separator. The previous code had three separator
 * conventions, an unbounded `back-` prefix match that claimed IDs bot-wide, and a
 * live `spotify-*` double-claim.
 */
export const Namespace = {
	Shop: "shop",
	Heist: "heist",
	Pet: "pet",
	Blackjack: "bj",
	Lottery: "lottery",
	Inventory: "inv",
	Reset: "reset",
	ModPanel: "modpanel",
	Ticket: "ticket",
	Help: "help",
	GuildList: "guildlist",
	UserInfo: "userinfo",
	Spotify: "spotify",
	Valorant: "valorant",
	Verify: "verify",
	Eval: "eval",
	Dbd: "dbd",
	Minecraft: "mc",
	ErrorTriage: "errtriage",
	Page: "page",
	Confirm: "confirm",
	Warn: "warn",
	Giveaway: "gw",
	Profile: "profile",
	Music: "music",
} as const;

export type Namespace = (typeof Namespace)[keyof typeof Namespace];

const SEPARATOR = ":";

const ALL_NAMESPACES: readonly string[] = Object.values(Namespace);

export function isNamespace(value: string): value is Namespace {
	return ALL_NAMESPACES.includes(value);
}

export interface DecodedId {
	ns: string;
	action: string;
	args: string[];
}

/**
 * Builds a custom ID. Throws above Discord's 100-character limit rather than
 * letting the API reject the whole message at send time.
 */
export function encodeId(ns: Namespace, action: string, ...args: (string | number)[]): string {
	const parts = [ns, action, ...args.map(String)];
	for (const part of parts) {
		if (part.includes(SEPARATOR)) {
			throw new Error(`customId segment must not contain "${SEPARATOR}": ${part}`);
		}
	}
	const id = parts.join(SEPARATOR);
	if (id.length > LIMITS.customIdLength) {
		throw new Error(`customId exceeds Discord's ${LIMITS.customIdLength}-character limit: ${id}`);
	}
	return id;
}

export function decodeId(raw: string): DecodedId {
	const [ns = "", action = "", ...args] = raw.split(SEPARATOR);
	return { ns, action, args };
}
