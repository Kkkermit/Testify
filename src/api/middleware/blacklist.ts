import { createMiddleware } from "hono/factory";
import { type ApiBindings } from "@api/context";
import { forbidden } from "@api/errors";
import { findBlacklistEntry } from "@database/repositories/blacklistRepository";

/**
 * A blacklisted account may sign in to read why, sign out and delete its own data, as `/delete-my-data` still runs in
 * Discord; every other route refuses it. The public routes stay open, since anybody signed out can read them anyway.
 */
const OPEN: readonly { methods: readonly string[]; path: RegExp }[] = [
	{ methods: ["GET", "HEAD"], path: /^\/api\/(?:health|bot|site)(?:\/[^?]*)?$/ },
	{ methods: ["GET", "HEAD"], path: /^\/api\/support(?:\/articles\/[^/]+)?$/ },
	{ methods: ["GET", "HEAD"], path: /^\/api\/auth\/(?:setup|login|callback|me)$/ },
	{ methods: ["POST"], path: /^\/api\/auth\/(?:logout|logout-all|erase)$/ },
];

export function openToTheBlacklisted(method: string, path: string): boolean {
	return OPEN.some((route) => route.methods.includes(method) && route.path.test(path));
}

export const refuseBlacklisted = createMiddleware<ApiBindings>(async (context, next) => {
	const session = context.get("session");

	if (
		session !== undefined &&
		!openToTheBlacklisted(context.req.method, context.req.path) &&
		(await findBlacklistEntry(session.userId)) !== null
	) {
		throw forbidden("blacklisted", "You are blocked from using this bot. You can still delete your data.");
	}

	await next();
});
