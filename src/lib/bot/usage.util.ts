import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { recordCommandUse, type UseRecord } from "@database/repositories/usageRepository";

/** Counts one invocation for the owner console, unawaited so the database never holds up a reply. */
export function countCommandUse(client: TestifyClient, use: UseRecord): void {
	void recordCommandUse(use).catch((error: unknown) => {
		client.logger.debug(
			{ err: toError(error), command: use.command },
			"[ANALYTICS] Could not record a command use. The command itself was unaffected.",
		);
	});
}
