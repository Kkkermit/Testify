import { type TestifyClient } from "@core/client";
import { sweepTempChannels } from "@lib/tempVoice";

/** Deletes made channels that emptied while the bot was away, and forgets those somebody deleted by hand. */
export async function sweepTempVoice(client: TestifyClient): Promise<void> {
	await sweepTempChannels(client);
}
