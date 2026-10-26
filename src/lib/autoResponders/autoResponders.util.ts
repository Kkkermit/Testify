import { SECOND_MS } from "@config/constants";
import { AUTO_RESPONDER_LIMITS, type AutoResponder, type AutoResponderMatch, triggerKey } from "@testify/shared";

/** Which responder a message sets off, and whether it may answer in that channel yet. */

export const MATCH_LABELS: Record<AutoResponderMatch, string> = {
	word: "Anywhere in a message, as whole words",
	exact: "Only the whole message",
	starts: "At the start of a message",
};

const WORD_CHARACTER = /[\p{L}\p{N}]/u;

function isWordCharacter(character: string | undefined): boolean {
	return character !== undefined && WORD_CHARACTER.test(character);
}

function foundAsWords(text: string, key: string): boolean {
	for (let at = text.indexOf(key); at !== -1; at = text.indexOf(key, at + 1)) {
		if (!isWordCharacter(text[at - 1]) && !isWordCharacter(text[at + key.length])) return true;
	}
	return false;
}

export function responderMatches(content: string, responder: Pick<AutoResponder, "trigger" | "match">): boolean {
	const text = triggerKey(content);
	const key = triggerKey(responder.trigger);
	if (key === "") return false;

	switch (responder.match) {
		case "exact":
			return text === key;
		case "starts":
			return text.startsWith(key) && !isWordCharacter(text[key.length]);
		case "word":
			return foundAsWords(text, key);
	}
}

/** The first that matches, so one message is answered once however many triggers it holds. */
export function responderFor(content: string, responders: readonly AutoResponder[]): AutoResponder | null {
	return responders.find((responder) => responderMatches(content, responder)) ?? null;
}

export const ANSWER_EVERY_MS = AUTO_RESPONDER_LIMITS.answerEverySeconds * SECOND_MS;

const lastAnswered = new Map<string, number>();

/** A busy channel saying the trigger word over and over hears the answer once in a while, not every time. */
export function shouldAnswer(
	guildId: string,
	channelId: string,
	responderId: string,
	now: number = Date.now(),
): boolean {
	const key = `${guildId}:${channelId}:${responderId}`;
	const last = lastAnswered.get(key);
	if (last !== undefined && now - last < ANSWER_EVERY_MS) return false;

	if (lastAnswered.size > 1_000) {
		for (const [entry, at] of lastAnswered) if (now - at >= ANSWER_EVERY_MS) lastAnswered.delete(entry);
	}
	lastAnswered.set(key, now);
	return true;
}
