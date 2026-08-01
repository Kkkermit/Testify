import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { recordCommandUse, type UseRecord } from "@database/repositories/usageRepository";

/**
 * Counts one command invocation for the owner console.
 *
 * Deliberately not awaited: the count is the least important thing that happened, and a slow or unavailable
 * database must not hold up the reply. Nothing downstream reads a result, so dropping the error after a debug
 * line loses nothing — a missing row is a missing row.
 */
export function countCommandUse(client: TestifyClient, use: UseRecord): void {
	void recordCommandUse(use).catch((error: unknown) => {
		client.logger.debug(
			{ err: toError(error), command: use.command },
			"[ANALYTICS] Could not record a command use. The command itself was unaffected.",
		);
	});
}
