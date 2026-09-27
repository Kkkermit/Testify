import { z } from "zod";

export const snowflake = z.string().regex(/^\d{17,20}$/, "must be a Discord ID");

/** Long enough that a URL carrying one cannot be used to push megabytes through a redirect. */
const MAX_RETURN_TO = 512;

const RETURN_PATH = /^\/[a-zA-Z0-9/_-]*$/;
/** `%` for percent-encoding, `.` for a decimal, `+` for a space — everything a `URLSearchParams` can emit. */
const RETURN_QUERY = /^[a-zA-Z0-9=&%+.,_~-]*$/;

/**
 * A relative path on this origin with an optional query, and nothing else. `//host` and backslashes are refused because
 * a browser resolves them to another origin, and the query is checked separately so a tabbed page survives sign-in.
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
