import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";

/** The rules about who may be blacklisted, in one place, because the command and the dashboard both apply them. */

/** The reason this user cannot be blacklisted, or null when they can. */
export function blacklistProblem(client: TestifyClient, userId: string): string | null {
	if (client.isOwner(userId)) return "You cannot blacklist a bot owner.";
	if (client.user?.id === userId) return "You cannot blacklist the bot itself.";

	return null;
}

export function assertBlacklistable(client: TestifyClient, userId: string): void {
	const problem = blacklistProblem(client, userId);
	if (problem !== null) throw new UserFacingError(problem);
}
