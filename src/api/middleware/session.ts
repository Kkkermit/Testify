import { PermissionFlagsBits } from "discord.js";
import { createMiddleware } from "hono/factory";
import { type ApiBindings } from "@api/context";
import { readCookie, SESSION_COOKIE } from "@api/cookies";
import { forbidden, notFound, unauthorised } from "@api/errors";
import { requireOauth } from "@api/oauth";
import { findSession, touchSession } from "@database/repositories/dashboardSessionRepository";

/**
 * Attaches the session when there is one and says nothing when there is not — `requireAuth` is what refuses.
 * Splitting them is what lets `/api/auth/me` answer 401 cleanly while the sign-in page stays reachable.
 */
export const loadSession = createMiddleware<ApiBindings>(async (context, next) => {
	const id = readCookie(context, SESSION_COOKIE);

	if (id !== null && id !== "" && context.get("oauth") !== null) {
		const session = await findSession(id);

		if (session !== null) {
			context.set("session", session);
			// Rolling, so someone working through a long edit is never signed out mid-task.
			await touchSession(session._id, requireOauth(context).sessionTtlDays);
		}
	}

	await next();
});

export const requireAuth = createMiddleware<ApiBindings>(async (context, next) => {
	if (context.get("session") === undefined) throw unauthorised();
	await next();
});

/**
 * The security boundary. Everything behind it assumes it ran.
 *
 * The guild id comes from the path parameter and nowhere else — a body field is attacker-controlled, and this
 * is the one place it is checked before anything reads it.
 */
export const requireGuild = createMiddleware<ApiBindings>(async (context, next) => {
	const session = context.get("session");
	if (session === undefined) throw unauthorised();

	const guildId = context.req.param("guildId") ?? "";
	if (!/^\d{17,20}$/.test(guildId)) throw notFound("bad_guild_id", "That is not a server ID.");

	// Not being in the guild is not a secret, and "here is an invite" is the right answer to it.
	const guild = context.get("client").guilds.cache.get(guildId);
	if (guild === undefined) throw notFound("guild_not_found", "Testify is not in that server.");

	const isOwner = context.get("client").isOwner(session.userId);

	if (!isOwner) {
		// Live, every request. The OAuth guild list is a login-time snapshot, so someone demoted five minutes
		// ago still has it in their session. This is the difference between losing access on their next click
		// and losing it next time they sign in.
		const member = await guild.members.fetch(session.userId).catch(() => null);
		if (member === null) throw forbidden("not_a_member", "You are not in that server.");

		if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
			throw forbidden("missing_manage_guild", "You need Manage Server in that server.");
		}

		context.set("member", member);
	}

	context.set("guild", guild);
	context.set("isOwner", isOwner);
	await next();
});

/** Ownership is read from the env per request, never off the session document. */
export const requireOwner = createMiddleware<ApiBindings>(async (context, next) => {
	const session = context.get("session");
	if (session === undefined) throw unauthorised();

	// 404 rather than 403: a manager has no business learning that an owner console exists here.
	if (!context.get("client").isOwner(session.userId)) throw notFound();

	await next();
});
