import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { eraseUserData } from "@database/repositories/accountRepository";
import { clearAfkCache } from "@database/repositories/afkRepository";
import { activity } from "@lib/info/activity.util";
import { forgetNoticeHint } from "@lib/notices/noticeActions.util";

/** Deletes everything the bot keeps about one person, at their own request; nothing can bring it back. */
export async function eraseAccount(client: TestifyClient, userId: string): Promise<void> {
	activity.forget(userId);
	forgetNoticeHint(userId);
	const posts = await eraseUserData(userId);
	clearAfkCache();

	// An idea's post carries their words, and a post Discord will not let go of is not worth failing the erase over.
	await Promise.all(
		posts.map(async ({ channelId, messageId }) => {
			try {
				const channel = await client.channels.fetch(channelId);
				if (channel?.isTextBased()) await channel.messages.delete(messageId);
			} catch (error) {
				client.logger.debug({ err: toError(error) }, "[ACCOUNT] An idea post could not be taken down.");
			}
		}),
	);

	client.logger.info("[ACCOUNT] Deleted the data one person asked the bot to forget.");
}
