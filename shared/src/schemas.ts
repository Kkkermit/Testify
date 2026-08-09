import { z } from "zod";

export const snowflake = z.string().regex(/^\d{17,20}$/, "must be a Discord ID");

/** Long enough that a URL carrying one cannot be used to push megabytes through a redirect. */
const MAX_RETURN_TO = 512;

const RETURN_PATH = /^\/[a-zA-Z0-9/_-]*$/;
/** `%` for percent-encoding, `.` for a decimal, `+` for a space — everything a `URLSearchParams` can emit. */
const RETURN_QUERY = /^[a-zA-Z0-9=&%+.,_~-]*$/;

/**
 * A relative path on this origin, with an optional query string, and nothing else.
 *
 * `//evil.example` is a protocol-relative URL: a browser reads it as `https://evil.example`, so a pattern that
 * only checks for a leading `/` is an open redirect. Backslashes are rejected for the same reason — browsers
 * normalise `/\evil.example` to `//evil.example`.
 *
 * The query half has to be allowed because the dashboard keeps tabs, pages and searches in the URL, so
 * `RequireAuth` carries `?tab=logs` through the sign-in. Refusing it made signing in impossible from any such
 * page. It is checked separately from the path rather than by widening one pattern, so the open-redirect rules
 * above still apply to the only part a browser resolves against the origin.
 */
export const returnTo = z
	.string()
	.max(MAX_RETURN_TO, "is too long")
	.refine((value) => !value.includes("\\"), "must not contain a backslash")
	.refine((value) => !value.startsWith("//"), "must not be a protocol-relative URL")
	// A fragment never reaches the server, so allowing one would only widen what has to be checked.
	.refine((value) => !value.includes("#"), "must not carry a fragment")
	.refine((value) => {
		const at = value.indexOf("?");
		const path = at === -1 ? value : value.slice(0, at);
		const query = at === -1 ? "" : value.slice(at + 1);

		return RETURN_PATH.test(path) && RETURN_QUERY.test(query);
	}, "must be a path on this site");

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
