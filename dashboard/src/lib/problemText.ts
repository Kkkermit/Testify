import { type Problem, type ProblemCode } from "@testify/shared";
import { type TFunction } from "i18next";
import { type TranslationKey } from "@/i18n";

/** The translation key for a refusal `@testify/shared` names, so the rule is shared and the wording is not. */

const KEYS: Record<ProblemCode, TranslationKey> = {
	"automod.word": "problem.automodWord",
	"automod.mentionLimit": "problem.automodMentionLimit",
	"giveaway.channel": "problem.giveawayChannel",
	"giveaway.prize": "problem.giveawayPrize",
	"giveaway.prizeLength": "problem.giveawayPrizeLength",
	"giveaway.winners": "problem.giveawayWinners",
	"giveaway.maxWinners": "problem.giveawayMaxWinners",
	"giveaway.tooShort": "problem.giveawayTooShort",
	"giveaway.tooLong": "problem.giveawayTooLong",
	"lottery.channel": "problem.lotteryChannel",
	"lottery.entryFee": "problem.lotteryEntryFee",
	"money.amount": "problem.moneyAmount",
	"money.tooLarge": "problem.moneyTooLarge",
	"money.walletShort": "problem.moneyWalletShort",
	"money.bankShort": "problem.moneyBankShort",
	"warning.reason": "problem.warningReason",
	"warning.reasonLength": "problem.warningReasonLength",
	"sticky.channel": "problem.stickyChannel",
	"sticky.duplicate": "problem.stickyDuplicate",
	"sticky.message": "problem.stickyMessage",
	"ticket.panelChannel": "problem.ticketPanelChannel",
	"ticket.category": "problem.ticketCategory",
	"ticket.transcriptChannel": "problem.ticketTranscriptChannel",
	"ticket.staffRole": "problem.ticketStaffRole",
	"treasure.messageRange": "problem.treasureMessageRange",
	"treasure.amountRange": "problem.treasureAmountRange",
};

export function problemText(problem: Problem, t: TFunction): string;
export function problemText(problem: Problem | null, t: TFunction): string | null;
export function problemText(problem: Problem | null, t: TFunction): string | null {
	return problem === null ? null : t(KEYS[problem.code], problem.values ?? {});
}
