import { UserFacingError } from "@core/errors";
import {
	createAutoResponder,
	deleteAutoResponder,
	findAutoResponder,
	listAutoResponders,
	updateAutoResponder,
} from "@database/repositories/autoResponderRepository";
import { problemText } from "@lib/format/problemText.util";
import {
	AUTO_RESPONDER_LIMITS,
	AUTO_RESPONDER_MATCHES,
	type AutoResponder,
	autoResponderBlocked,
	type AutoResponderInput,
	type AutoResponderList,
	type AutoResponderMatch,
	problem,
	sanitiseLine,
	sanitiseText,
} from "@testify/shared";

/** Adding, changing and removing a server's responders: the one path the panel and the dashboard both take. */

const GONE = "That auto-responder has been deleted.";

export async function readAutoResponders(guildId: string): Promise<AutoResponderList> {
	return { responders: await listAutoResponders(guildId), limit: AUTO_RESPONDER_LIMITS.maxPerGuild };
}

export async function readAutoResponder(guildId: string, id: string): Promise<AutoResponder> {
	const responder = await findAutoResponder(guildId, id);
	if (responder === null) throw new UserFacingError(GONE);
	return responder;
}

/** `others` are the responders it must not repeat, which leaves out the one being edited. */
function cleaned(input: AutoResponderInput, others: readonly AutoResponder[]): AutoResponderInput {
	const clean = { trigger: sanitiseLine(input.trigger), match: input.match, reply: sanitiseText(input.reply) };

	const blocked = autoResponderBlocked(clean, others);
	if (blocked !== null) throw new UserFacingError(problemText(blocked));
	if (clean.trigger.length > AUTO_RESPONDER_LIMITS.maxTrigger) {
		throw new UserFacingError(`Keep the words it answers to ${String(AUTO_RESPONDER_LIMITS.maxTrigger)} characters.`);
	}
	if (clean.reply.length > AUTO_RESPONDER_LIMITS.maxReply) {
		throw new UserFacingError(`Keep the reply to ${String(AUTO_RESPONDER_LIMITS.maxReply)} characters.`);
	}

	return clean;
}

export async function addAutoResponder(
	guildId: string,
	input: AutoResponderInput,
	updatedBy: string | null,
): Promise<AutoResponder> {
	const current = await listAutoResponders(guildId);
	if (current.length >= AUTO_RESPONDER_LIMITS.maxPerGuild) {
		throw new UserFacingError(
			`A server can keep ${String(AUTO_RESPONDER_LIMITS.maxPerGuild)} auto-responders. Delete one to add another.`,
		);
	}

	const created = await createAutoResponder(guildId, cleaned(input, current), updatedBy);
	if (created === null) throw new UserFacingError(problemText(problem("autoResponder.duplicate")));
	return created;
}

export async function editAutoResponder(
	guildId: string,
	id: string,
	input: AutoResponderInput,
	updatedBy: string | null,
): Promise<AutoResponder> {
	const others = (await listAutoResponders(guildId)).filter((responder) => responder.id !== id);
	const result = await updateAutoResponder(guildId, id, cleaned(input, others), updatedBy);

	if (result === "missing") throw new UserFacingError(GONE);
	if (result === "duplicate") throw new UserFacingError(problemText(problem("autoResponder.duplicate")));
	return result;
}

export async function removeAutoResponder(guildId: string, id: string): Promise<void> {
	if (!(await deleteAutoResponder(guildId, id))) throw new UserFacingError(GONE);
}

/** The panel's Change button walks through the three in turn. */
export function nextMatch(match: AutoResponderMatch): AutoResponderMatch {
	return AUTO_RESPONDER_MATCHES[(AUTO_RESPONDER_MATCHES.indexOf(match) + 1) % AUTO_RESPONDER_MATCHES.length] ?? "word";
}
