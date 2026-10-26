import { z } from "zod";
import { type Problem, problem } from "./problems";
import { plainLine, plainText } from "./text";

/** A server's own trigger words, each answered with a reply somebody wrote. Neither ever pings anybody. */

export const AUTO_RESPONDER_LIMITS = {
	maxTrigger: 100,
	maxReply: 2_000,
	/** Discord lists them in one select menu, which holds 25. */
	maxPerGuild: 25,
	/** How long one responder waits before answering in the same channel again. */
	answerEverySeconds: 10,
} as const;

/** Whole words anywhere, the whole message, or the start of it. Never a bare substring, or "hi" answers "this". */
export const AUTO_RESPONDER_MATCHES = ["word", "exact", "starts"] as const;

export type AutoResponderMatch = (typeof AUTO_RESPONDER_MATCHES)[number];

export interface AutoResponder {
	id: string;
	trigger: string;
	match: AutoResponderMatch;
	reply: string;
}

export interface AutoResponderList {
	responders: AutoResponder[];
	limit: number;
}

export const autoResponderInput = z.object({
	trigger: plainLine(1, AUTO_RESPONDER_LIMITS.maxTrigger),
	match: z.enum(AUTO_RESPONDER_MATCHES),
	reply: plainText(1, AUTO_RESPONDER_LIMITS.maxReply),
});

export type AutoResponderInput = z.infer<typeof autoResponderInput>;

export const autoResponderParams = z.object({
	responderId: z.string().regex(/^[a-f\d]{24}$/, "must be a responder id"),
});

/** Case, spacing and look-alike characters do not make two triggers different. */
export function triggerKey(trigger: string): string {
	return trigger.normalize("NFKC").toLowerCase().trim().replace(/\s+/g, " ");
}

/** Why a responder cannot be saved, as the form and the bot both say it; `others` excludes the one being edited. */
export function autoResponderBlocked(
	entry: { trigger: string; reply: string },
	others: readonly Pick<AutoResponder, "trigger">[],
): Problem | null {
	if (triggerKey(entry.trigger) === "") return problem("autoResponder.trigger");
	if (entry.reply.trim() === "") return problem("autoResponder.reply");
	if (others.some((other) => triggerKey(other.trigger) === triggerKey(entry.trigger))) {
		return problem("autoResponder.duplicate");
	}

	return null;
}
