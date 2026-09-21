import { type Problem, type ProblemCode } from "@testify/shared";

/** The English sentence for a refusal `@testify/shared` names, so the rule lives there and the wording here. */

const SENTENCES: Record<ProblemCode, (values: Record<string, number>) => string> = {
	"automod.word": () => "Type the word or phrase to block.",
	"automod.mentionLimit": () => "Choose how many mentions to allow.",
	"giveaway.channel": () => "Pick a channel to post it in.",
	"giveaway.prize": () => "Say what is being given away.",
	"giveaway.prizeLength": ({ max = 0 }) => `The prize cannot be longer than ${String(max)} characters.`,
	"giveaway.winners": () => "There has to be at least one winner.",
	"giveaway.maxWinners": ({ max = 0 }) => `Discord will not let one giveaway have more than ${String(max)} winners.`,
	"giveaway.tooShort": () => "A giveaway has to run for at least a minute.",
	"giveaway.tooLong": () => "A giveaway cannot run for longer than 30 days.",
	"lottery.channel": () => "Choose where draws are announced.",
	"lottery.entryFee": ({ min = 0 }) => `A ticket has to cost at least ${String(min)}.`,
	"money.amount": () => "Enter an amount to add or take away.",
	"money.tooLarge": ({ max = 0 }) => `One change cannot be more than ${max.toLocaleString()}.`,
	"money.walletShort": ({ held = 0 }) => `They only have ${held.toLocaleString()} in their wallet.`,
	"money.bankShort": ({ held = 0 }) => `They only have ${held.toLocaleString()} in their bank.`,
	"warning.reason": () => "Say why they are being warned.",
	"warning.reasonLength": ({ max = 0 }) => `A reason cannot be longer than ${String(max)} characters.`,
	"sticky.channel": () => "Pick a channel for this sticky.",
	"sticky.duplicate": () => "That channel already has a sticky. Edit the existing one instead.",
	"sticky.message": () => "A sticky needs something to say.",
	"ticket.panelChannel": () => "Choose where the panel is posted.",
	"ticket.category": () => "Choose the category new tickets are created in.",
	"ticket.transcriptChannel": () => "Choose where transcripts are sent.",
	"ticket.staffRole": () => "Choose the role that handles tickets.",
	"treasure.messageRange": () => "The fewest messages cannot be more than the most.",
	"treasure.amountRange": () => "The smallest drop cannot be more than the largest.",
};

export function problemText(problem: Problem): string;
export function problemText(problem: Problem | null): string | null;
export function problemText(problem: Problem | null): string | null {
	return problem === null ? null : SENTENCES[problem.code](problem.values ?? {});
}
