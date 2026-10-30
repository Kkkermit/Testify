import { type TestifyClient } from "@core/client";
import { sweepScratchFolders } from "@lib/music";

/** Clears what downloads cut short by a crash left in the temporary folder; a running bot clears its own. */
export async function sweepMusicScratch(client: TestifyClient): Promise<void> {
	const removed = await sweepScratchFolders();
	if (removed > 0) client.logger.debug({ removed }, "[MUSIC] Removed download folders an earlier run left behind.");
}
