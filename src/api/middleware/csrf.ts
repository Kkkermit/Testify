import { createMiddleware } from "hono/factory";
import { type ApiBindings } from "@api/context";
import { CSRF_COOKIE, readCookie } from "@api/cookies";
import { forbidden } from "@api/errors";
import { secretsMatch } from "@lib/secretBox.util";

const CSRF_HEADER = "x-csrf-token";

/** Safe by definition, which is why no `GET` may ever mutate anything. */
const READ_ONLY = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Double-submit: the SPA reads the readable `dash_csrf` cookie and echoes it in a header. Another site can make
 * the browser send the cookie, but it cannot read it to set the header, and it cannot set the header
 * cross-origin without a preflight this API never approves.
 *
 * `SameSite=Lax` already blocks most of this. Both are here because `Lax` has exceptions and browsers change.
 */
export const verifyCsrf = createMiddleware<ApiBindings>(async (context, next) => {
	if (READ_ONLY.has(context.req.method)) {
		await next();
		return;
	}

	const header = context.req.header(CSRF_HEADER) ?? "";
	const cookie = readCookie(context, CSRF_COOKIE) ?? "";
	const session = context.get("session");

	// A session's stored secret is the authority when there is one; the cookie alone covers the unauthenticated
	// endpoints. Comparison is timing-safe, and no branch says which half was wrong.
	const expected = session?.csrfSecret ?? cookie;

	if (header === "" || cookie === "" || !secretsMatch(header, cookie) || !secretsMatch(header, expected)) {
		throw forbidden("csrf", "That request could not be verified. Reload the page and try again.");
	}

	await next();
});
