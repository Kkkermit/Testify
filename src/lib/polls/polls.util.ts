import { type InteractionReplyOptions } from "discord.js";
import { UserFacingError } from "@core/errors";
import { ANSWER_SEPARATOR, POLL_LIMITS } from "@lib/polls/polls.constants";

/** A poll Discord itself runs, so the bot counts nothing and stores nothing. */

export interface PollRequest {
	question: string;
	answers: string;
	hours: number | null;
	multiple: boolean | null;
}

export function parseAnswers(input: string): string[] {
	const answers = input
		.split(ANSWER_SEPARATOR)
		.map((answer) => answer.trim())
		.filter((answer) => answer !== "");
	const { minAnswers, maxAnswers, maxAnswer } = POLL_LIMITS;

	if (answers.length < minAnswers || answers.length > maxAnswers) {
		throw new UserFacingError(
			`Give ${String(minAnswers)} to ${String(maxAnswers)} answers, separated by \`${ANSWER_SEPARATOR}\`, like \`Yes ${ANSWER_SEPARATOR} No\`.`,
		);
	}

	const tooLong = answers.find((answer) => answer.length > maxAnswer);
	if (tooLong !== undefined) {
		throw new UserFacingError(`Keep each answer to ${String(maxAnswer)} characters. "${tooLong}" is longer.`);
	}

	const seen = new Set(answers.map((answer) => answer.toLowerCase()));
	if (seen.size !== answers.length) throw new UserFacingError("Each answer has to be different.");

	return answers;
}

export function pollMessage(request: PollRequest): InteractionReplyOptions {
	const question = request.question.trim();
	const { maxQuestion, minHours, maxHours, defaultHours } = POLL_LIMITS;

	if (question === "") throw new UserFacingError("Ask a question for the poll.");
	if (question.length > maxQuestion) {
		throw new UserFacingError(`Keep the question to ${String(maxQuestion)} characters.`);
	}

	const hours = request.hours ?? defaultHours;
	if (!Number.isInteger(hours) || hours < minHours || hours > maxHours) {
		throw new UserFacingError(
			`A poll can stay open from ${String(minHours)} hour to ${String(maxHours)} hours (32 days).`,
		);
	}

	return {
		poll: {
			question: { text: question },
			answers: parseAnswers(request.answers).map((text) => ({ text })),
			duration: hours,
			allowMultiselect: request.multiple ?? false,
		},
		allowedMentions: { parse: [] },
	};
}
