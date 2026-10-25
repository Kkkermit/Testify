/** The identifiers and limits more than one module in this domain reads. */

export const POLL_COMMAND = "poll";

/** Discord's own limits on a poll, so a refusal names them before Discord refuses the whole message. */
export const POLL_LIMITS = {
	maxQuestion: 300,
	maxAnswer: 55,
	minAnswers: 2,
	maxAnswers: 10,
	/** Hours; Discord keeps a poll open for at most 32 days. */
	minHours: 1,
	maxHours: 768,
	defaultHours: 24,
} as const;

/** What separates one answer from the next in the `answers` option. */
export const ANSWER_SEPARATOR = "|";
