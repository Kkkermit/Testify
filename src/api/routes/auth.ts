import { type Context, Hono } from "hono";
import { z } from "zod";
import { type ApiBindings } from "@api/context";
import {
	clearAuthCookies,
	OAUTH_COOKIE,
	readCookie,
	setCsrfCookie,
	setOauthCookie,
	setSessionCookie,
} from "@api/cookies";
import {
	authoriseUrl,
	avatarUrl,
	callbackUrl,
	canManage,
	exchangeCode,
	fetchGuilds,
	fetchUser,
	guildIconUrl,
	type OauthGuild,
	refreshTokens,
	startLogin,
	statesMatch,
} from "@api/discord";
import { badRequest, forbidden, unauthorised } from "@api/errors";
import { requireAuth } from "@api/middleware/session";
import { missingSettings, type OauthConfig, requireOauth } from "@api/oauth";
import { parseQuery } from "@api/validate";
import { type DashboardSession } from "@database/models/dashboardSession.schema";
import {
	createSession,
	deleteSession,
	deleteSessionsFor,
	readTokens,
	updateTokens,
} from "@database/repositories/dashboardSessionRepository";
import { type ManageableGuild, type MeResponse, returnTo as returnToSchema, type SetupStatus } from "@testify/shared";

type ApiContext = Context<ApiBindings>;

const DAY_SECONDS = 24 * 60 * 60;
/** Discord access tokens last a week; refresh once an hour is left rather than waiting for a 401. */
const REFRESH_WITHIN_MS = 60 * 60 * 1_000;

const pendingSchema = z.object({ state: z.string().min(1), verifier: z.string().min(1), returnTo: returnToSchema });
type Pending = z.infer<typeof pendingSchema>;

const loginQuery = z.object({ returnTo: returnToSchema.optional() });
const callbackQuery = z.object({
	code: z.string().min(1).max(200).optional(),
	state: z.string().min(1).max(200).optional(),
	error: z.string().max(100).optional(),
});

function sessionOf(context: ApiContext): DashboardSession {
	const session = context.get("session");
	if (session === undefined) throw unauthorised();

	return session;
}

export const auth = new Hono<ApiBindings>();

/**
 * Unauthenticated on purpose: it is how the sign-in page knows to show setup instructions rather than a button.
 * It names which variables are missing and never what any of them hold.
 */
auth.get("/setup", (context) => {
	const env = context.get("env");
	const missing = missingSettings(env);

	const body: SetupStatus = {
		configured: missing.length === 0,
		missing,
		redirectUri: callbackUrl(env.DASHBOARD_BASE_URL ?? "http://localhost:5174"),
	};

	return context.json(body);
});

auth.get("/login", (context) => {
	const oauth = requireOauth(context);
	const { returnTo } = parseQuery(context, loginQuery);

	// A cookie rather than server memory, so the flow survives a restart, and rather than a database write, so
	// an unauthenticated endpoint cannot be used to fill the collection.
	const pending = startLogin(returnTo ?? "/guilds");
	setOauthCookie(context, context.get("env"), JSON.stringify(pending));

	return context.redirect(authoriseUrl(oauth.clientId, oauth.baseUrl, pending), 302);
});

auth.get("/callback", async (context) => {
	const oauth = requireOauth(context);
	const env = context.get("env");
	const query = parseQuery(context, callbackQuery);
	const pending = readPending(context);

	// One state, one use — cleared whether this succeeds or not.
	clearAuthCookies(context, env);

	// They pressed Cancel. A friendly page, not a stack trace.
	if (query.error !== undefined) return context.redirect("/sign-in?denied=1", 302);
	if (query.code === undefined || query.state === undefined) throw badRequest("That sign-in link is incomplete.");

	if (pending === null || !statesMatch(query.state, pending.state)) {
		throw forbidden("bad_state", "That sign-in could not be verified. Start again.");
	}

	const tokens = await exchangeCode(oauth, query.code, pending.verifier);
	const user = await fetchUser(tokens.accessToken);

	const issued = await createSession(
		oauth.box,
		{
			userId: user.id,
			username: user.username,
			avatar: user.avatar,
			isOwner: context.get("client").isOwner(user.id),
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			tokenExpiresAt: tokens.expiresAt,
		},
		oauth.sessionTtlDays,
	);

	const maxAge = oauth.sessionTtlDays * DAY_SECONDS;
	setSessionCookie(context, env, issued.id, maxAge);
	setCsrfCookie(context, env, issued.csrfSecret, maxAge);

	// `returnTo` was validated as a relative path before it was ever put in the cookie.
	return context.redirect(pending.returnTo, 302);
});

auth.post("/logout", requireAuth, async (context) => {
	await deleteSession(sessionOf(context)._id);
	clearAuthCookies(context, context.get("env"));

	return context.body(null, 204);
});

/** The panic button after a leak: every browser this person is signed in on loses access at once. */
auth.post("/logout-all", requireAuth, async (context) => {
	await deleteSessionsFor(sessionOf(context).userId);
	clearAuthCookies(context, context.get("env"));

	return context.body(null, 204);
});

/**
 * The SPA's bootstrap call. 401 here is the signal to render the sign-in screen rather than an error, which is
 * why it is a normal answer and not a failure.
 */
auth.get("/me", requireAuth, async (context) => {
	const oauth = requireOauth(context);
	const client = context.get("client");
	const session = sessionOf(context);

	const body: MeResponse = {
		user: { id: session.userId, username: session.username, avatarUrl: avatarUrl(session.userId, session.avatar) },
		// Read from the env per request. Removing someone from it and restarting must lock them out immediately.
		isOwner: client.isOwner(session.userId),
		guilds: await guildsFor(context, oauth, session),
	};

	return context.json(body);
});

function readPending(context: ApiContext): Pending | null {
	const raw = readCookie(context, OAUTH_COOKIE);
	if (raw === null) return null;

	try {
		return pendingSchema.parse(JSON.parse(raw));
	} catch {
		return null;
	}
}

/**
 * The intersection of what Discord says the user is in and what the bot is actually in, so the picker can also
 * offer an invite for the rest — a real conversion path that costs nothing.
 */
async function guildsFor(
	context: ApiContext,
	oauth: OauthConfig,
	session: DashboardSession,
): Promise<ManageableGuild[]> {
	const client = context.get("client");
	const owner = client.isOwner(session.userId);
	const accessToken = await usableToken(oauth, session);

	return (await fetchGuilds(accessToken))
		.filter((guild) => owner || canManage(guild.permissions))
		.map((guild) => toManageable(guild, client.guilds.cache.get(guild.id)?.memberCount, canManage(guild.permissions)))
		.sort((a, b) => Number(b.botPresent) - Number(a.botPresent) || a.name.localeCompare(b.name));
}

async function usableToken(oauth: OauthConfig, session: DashboardSession): Promise<string> {
	const tokens = readTokens(oauth.box, session);
	// The session secret has been rotated since they signed in, so the sealed tokens no longer open.
	if (tokens === null) throw unauthorised();

	if (session.tokenExpiresAt.getTime() - Date.now() >= REFRESH_WITHIN_MS) return tokens.accessToken;

	const refreshed = await refreshTokens(oauth, tokens.refreshToken).catch(() => null);
	// A refusal to refresh means the sign-in is over, and a 401 shows the sign-in screen rather than an error.
	if (refreshed === null) throw unauthorised();

	await updateTokens(oauth.box, session._id, {
		accessToken: refreshed.accessToken,
		refreshToken: refreshed.refreshToken,
		tokenExpiresAt: refreshed.expiresAt,
	});

	return refreshed.accessToken;
}

function toManageable(guild: OauthGuild, memberCount: number | undefined, canInvite: boolean): ManageableGuild {
	return {
		id: guild.id,
		name: guild.name,
		iconUrl: guildIconUrl(guild.id, guild.icon),
		memberCount: memberCount ?? null,
		botPresent: memberCount !== undefined,
		canInvite,
	};
}
