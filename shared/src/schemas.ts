import { z } from "zod";

export const snowflake = z.string().regex(/^\d{17,20}$/, "must be a Discord ID");

/** Long enough that a URL carrying one cannot be used to push megabytes through a redirect. */
const MAX_RETURN_TO = 512;

/**
 * A relative path on this origin, and nothing else.
 *
 * `//evil.example` is a protocol-relative URL: a browser reads it as `https://evil.example`, so a pattern that
 * only checks for a leading `/` is an open redirect. Backslashes are rejected for the same reason — browsers
 * normalise `/\evil.example` to `//evil.example`.
 */
export const returnTo = z
	.string()
	.max(MAX_RETURN_TO, "is too long")
	.regex(/^\/[a-zA-Z0-9/_-]*$/, "must be a path on this site")
	.refine((path) => !path.startsWith("//"), "must not be a protocol-relative URL");

export const guildIdParam = z.object({ guildId: snowflake });

export const pagination = z.object({
	page: z.coerce.number().int().min(1).max(10_000).default(1),
	perPage: z.coerce.number().int().min(1).max(100).default(25),
});

export type Pagination = z.infer<typeof pagination>;

/**
 * Anything a manager types that ends up in a Discord message. The cap is Discord's own, and control characters
 * are stripped because they render as nothing and are how a hidden payload is smuggled past a human reviewing
 * a config.
 */
export function boundedText(max: number, label = "text"): z.ZodType<string> {
	return z
		.string()
		.max(max, `${label} cannot be longer than ${String(max)} characters`)
		.transform((value) => value.replaceAll(/[\p{Cc}\p{Cf}]/gu, (match) => (match === "\n" ? match : "")));
}
