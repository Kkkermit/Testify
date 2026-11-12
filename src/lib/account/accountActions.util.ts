import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { logRing } from "@core/logRing";
import { eraseUserData } from "@database/repositories/accountRepository";
import { clearAfkCache } from "@database/repositories/afkRepository";
import { forgetInLogs } from "@database/repositories/logRepository";
import { activity } from "@lib/info/activity.util";
import { forgetNoticeHint } from "@lib/notices/noticeActions.util";

/** Deletes everything the bot keeps about one person, at their own request; nothing can bring it back. */
export async function eraseAccount(client: TestifyClient, userId: string): Promise<void> {
	activity.forget(userId);
	forgetNoticeHint(userId);
	logRing.forget(userId);
	const [posts] = await Promise.all([eraseUserData(userId), forgetInLogs(userId)]);
	clearAfkCache();

	// An idea's or an appeal's post carries their words, and one Discord will not let go of is not worth failing over.
	await Promise.all(
		posts.map(async ({ channelId, messageId }) => {
			try {
				const channel = await client.channels.fetch(channelId);
				if (channel?.isTextBased()) await channel.messages.delete(messageId);
			} catch (error) {
				client.logger.debug({ err: toError(error) }, "[ACCOUNT] A post of theirs could not be taken down.");
			}
		}),
	);

	client.logger.info("[ACCOUNT] Deleted the data one person asked the bot to forget.");
}
