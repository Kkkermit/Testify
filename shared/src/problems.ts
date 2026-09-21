/** A refusal named rather than written, so the bot and the dashboard each render it in their own words. */

export const PROBLEM_CODES = [
	"automod.word",
	"automod.mentionLimit",
	"giveaway.channel",
	"giveaway.prize",
	"giveaway.prizeLength",
	"giveaway.winners",
	"giveaway.maxWinners",
	"giveaway.tooShort",
	"giveaway.tooLong",
	"lottery.channel",
	"lottery.entryFee",
	"money.amount",
	"money.tooLarge",
	"money.walletShort",
	"money.bankShort",
	"warning.reason",
	"warning.reasonLength",
	"sticky.channel",
	"sticky.duplicate",
	"sticky.message",
	"ticket.panelChannel",
	"ticket.category",
	"ticket.transcriptChannel",
	"ticket.staffRole",
	"treasure.messageRange",
	"treasure.amountRange",
] as const;

export type ProblemCode = (typeof PROBLEM_CODES)[number];

export interface Problem {
	code: ProblemCode;
	/** Numbers a sentence interpolates, left raw so each surface groups them for its own locale. */
	values?: Record<string, number>;
}

export function problem(code: ProblemCode, values?: Record<string, number>): Problem {
	return values === undefined ? { code } : { code, values };
}
