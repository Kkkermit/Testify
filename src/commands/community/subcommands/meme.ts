import { z } from "zod";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { embed } from "../../../lib/embeds";
import { formatNumber } from "../../../lib/format";
import { fetchJson } from "../../../lib/http";
import { reply } from "../../../lib/reply";

const listingSchema = z.object({
	data: z.object({
		children: z.array(
			z.object({
				data: z.object({
					title: z.string(),
					url: z.string(),
					permalink: z.string(),
					ups: z.number().default(0),
					num_comments: z.number().default(0),
					over_18: z.boolean().default(false),
					is_video: z.boolean().default(false),
					subreddit_name_prefixed: z.string(),
				}),
			}),
		),
	}),
});

const SUBREDDITS = ["memes", "dankmemes", "me_irl", "wholesomememes", "ProgrammerHumor"];

export default defineCommand({
	name: "meme",
	description: "Fetches a random meme from Reddit.",
	category: "community",
	cooldown: 5_000,
	options: [
		{
			name: "subreddit",
			description: "Which subreddit to pull from.",
			type: "string",
			choices: SUBREDDITS.map((name) => ({ name, value: name })),
		},
	],

	async run(interaction) {
		await interaction.deferReply();

		const subreddit =
			interaction.options.getString("subreddit") ?? SUBREDDITS[Math.floor(Math.random() * SUBREDDITS.length)]!;
		const listing = await fetchJson("reddit", `https://www.reddit.com/r/${subreddit}/hot.json`, listingSchema, {
			query: { limit: 60 },
			headers: { "User-Agent": "Testify Discord bot" },
		});

		const nsfwAllowed = interaction.channel !== null && "nsfw" in interaction.channel && interaction.channel.nsfw;
		const posts = listing.data.children
			.map((child) => child.data)
			.filter((post) => !post.is_video && (nsfwAllowed || !post.over_18))
			.filter((post) => /\.(png|jpe?g|gif|webp)$/i.test(post.url));

		const post = posts[Math.floor(Math.random() * posts.length)];
		if (!post) throw new UserFacingError("I could not find a suitable meme just now. Try again.");

		await reply(interaction, {
			embeds: [
				embed({
					category: "community",
					title: post.title,
					url: `https://reddit.com${post.permalink}`,
					image: post.url,
					footer: `${post.subreddit_name_prefixed} \u00b7 \u2b06 ${formatNumber(post.ups)} \u00b7 \u{1f4ac} ${formatNumber(post.num_comments)}`,
				}),
			],
		});
	},
});
