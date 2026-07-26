import { z } from "zod";
import { ExternalApiError } from "../core/errors";
import { fetchJson } from "./http";

/**
 * A deliberately small, typed Instagram reader. The previous 391-line scraping
 * layer rotated cookies and user agents to defeat anti-bot measures, and every
 * failure path collapsed to `null`.
 */

const postSchema = z.object({
	id: z.string(),
	shortcode: z.string(),
	takenAt: z.number(),
	caption: z.string(),
	imageUrl: z.string(),
});

export type InstagramPost = z.infer<typeof postSchema>;

const responseSchema = z.object({
	data: z.object({
		user: z
			.object({
				edge_owner_to_timeline_media: z.object({
					edges: z.array(
						z.object({
							node: z.object({
								id: z.string(),
								shortcode: z.string(),
								taken_at_timestamp: z.number(),
								display_url: z.string(),
								edge_media_to_caption: z.object({
									edges: z.array(z.object({ node: z.object({ text: z.string() }) })),
								}),
							}),
						}),
					),
				}),
			})
			.nullable(),
	}),
});

export async function fetchLatestPosts(username: string, limit = 5): Promise<InstagramPost[]> {
	const payload = await fetchJson(
		"instagram",
		"https://www.instagram.com/api/v1/users/web_profile_info/",
		responseSchema,
		{
			query: { username },
			headers: {
				"User-Agent": "Mozilla/5.0 (compatible; TestifyBot/2.0; +https://github.com/Kkkermit/Testify)",
				"X-IG-App-ID": "936619743392459",
				Accept: "application/json",
			},
		},
	);

	const user = payload.data.user;
	if (!user) throw new ExternalApiError("instagram", new Error(`No profile found for ${username}`));

	return user.edge_owner_to_timeline_media.edges.slice(0, limit).map(({ node }) =>
		postSchema.parse({
			id: node.id,
			shortcode: node.shortcode,
			takenAt: node.taken_at_timestamp * 1_000,
			caption: node.edge_media_to_caption.edges[0]?.node.text ?? "",
			imageUrl: node.display_url,
		}),
	);
}

export function postUrl(post: InstagramPost): string {
	return `https://www.instagram.com/p/${post.shortcode}/`;
}
