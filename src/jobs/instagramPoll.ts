import { Category } from "../config/categories";
import { type TestifyClient } from "../core/client";
import { toError } from "../core/errors";
import { listInstagramWatches, setInstagramLastPost } from "../database/repositories/integrationRepository";
import { fetchLatestPosts, postUrl } from "../integrations/instagram";
import { embed } from "../ui/embeds";
import { truncate } from "../ui/format";

export async function pollInstagram(client: TestifyClient): Promise<void> {
	const watches = await listInstagramWatches();

	for (const watch of watches) {
		const channel = await client.channels.fetch(watch.channelId).catch(() => null);
		if (!channel?.isTextBased() || !channel.isSendable()) continue;

		for (const username of watch.usernames) {
			try {
				const posts = await fetchLatestPosts(username, 3);
				const since = watch.lastPostDates[username];
				const cutoff = since === undefined ? 0 : new Date(since).getTime();

				const fresh = posts.filter((post) => post.takenAt > cutoff).sort((a, b) => a.takenAt - b.takenAt);
				if (fresh.length === 0) continue;

				for (const post of fresh) {
					await channel.send({
						embeds: [
							embed({
								category: Category.Integrations,
								title: `New post from @${username}`,
								url: postUrl(post),
								description: truncate(post.caption, 800),
								image: post.imageUrl,
								footer: "Instagram",
							}),
						],
					});
				}

				const newest = fresh.at(-1);
				if (newest) await setInstagramLastPost(watch.guildId, username, new Date(newest.takenAt));
			} catch (error) {
				client.logger.debug(
					{ err: toError(error), username, guildId: watch.guildId },
					"Instagram poll failed for a watched account",
				);
			}
		}
	}
}
