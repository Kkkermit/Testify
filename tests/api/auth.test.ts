import {
	authoriseUrl,
	callbackUrl,
	canManage,
	fetchGuilds,
	MAX_RETRY_WAIT_MS,
	startLogin,
	statesMatch,
} from "@api/discord";
import { UpstreamProblem } from "@api/errors";
import { missingSettings, oauthConfigFrom } from "@api/oauth";
import { type Env } from "@config/env";

function envWith(overrides: Partial<Env> = {}): Env {
	return {
		DISCORD_CLIENT_ID: "123456789012345678",
		DISCORD_CLIENT_SECRET: "a-client-secret",
		DASHBOARD_BASE_URL: "https://dash.example.com",
		DASHBOARD_SESSION_SECRET: "a".repeat(32),
		DASHBOARD_SESSION_TTL_DAYS: 7,
		...overrides,
	} as Env;
}

describe("callbackUrl", () => {
	it("is the base URL plus the callback path", () => {
		expect(callbackUrl("https://dash.example.com")).toBe("https://dash.example.com/api/auth/callback");
	});

	/** A trailing slash in the env would make the redirect URI stop matching what Discord has registered. */
	it("does not double the slash when the base URL has one", () => {
		expect(callbackUrl("https://dash.example.com/")).toBe("https://dash.example.com/api/auth/callback");
	});
});

describe("startLogin", () => {
	it("gives a distinct state and verifier every time", () => {
		const first = startLogin("/guilds");
		const second = startLogin("/guilds");

		expect(first.state).not.toBe(first.verifier);
		expect(first.state).not.toBe(second.state);
		expect(first.verifier.length).toBeGreaterThanOrEqual(43);
	});

	it("remembers where the sign-in came from", () => {
		expect(startLogin("/guilds/1/levelling").returnTo).toBe("/guilds/1/levelling");
	});
});

describe("authoriseUrl", () => {
	const url = new URL(authoriseUrl("123456789012345678", "https://dash.example.com", startLogin("/guilds")));

	/** Asking for `email` reads as a mailing-list harvest and costs sign-ups. Two scopes, both explainable. */
	it("asks for identify and guilds and nothing else", () => {
		expect(url.searchParams.get("scope")).toBe("identify guilds");
	});

	it("sends a PKCE challenge rather than the verifier", () => {
		const pending = startLogin("/guilds");
		const built = new URL(authoriseUrl("123456789012345678", "https://dash.example.com", pending));

		expect(built.searchParams.get("code_challenge_method")).toBe("S256");
		expect(built.searchParams.get("code_challenge")).not.toBe(pending.verifier);
		expect(built.toString()).not.toContain(pending.verifier);
	});

	it("names the redirect URI Discord will be asked to match", () => {
		expect(url.searchParams.get("redirect_uri")).toBe("https://dash.example.com/api/auth/callback");
	});

	/** Skipping the consent screen for anyone who has authorised before is what makes returning feel instant. */
	it("does not re-prompt someone who has already authorised", () => {
		expect(url.searchParams.get("prompt")).toBe("none");
	});
});

describe("statesMatch", () => {
	/** A callback carrying somebody else's code must not sign the victim into the attacker's account. */
	it("accepts only the exact state that was issued", () => {
		expect(statesMatch("abc123", "abc123")).toBe(true);
		expect(statesMatch("abc123", "abc124")).toBe(false);
	});

	it("refuses an empty state rather than treating it as a match", () => {
		expect(statesMatch("", "")).toBe(false);
		expect(statesMatch("", "abc")).toBe(false);
	});

	/** `timingSafeEqual` throws on a length mismatch, which would be a 500 instead of a 403. */
	it("refuses different lengths without throwing", () => {
		expect(statesMatch("abc", "abcd")).toBe(false);
	});
});

describe("canManage", () => {
	const MANAGE_GUILD = 1n << 5n;

	it("reads the Manage Server bit out of the permission string", () => {
		expect(canManage(MANAGE_GUILD.toString())).toBe(true);
		expect(canManage((MANAGE_GUILD | 1n).toString())).toBe(true);
	});

	it("is false without it", () => {
		expect(canManage("0")).toBe(false);
		expect(canManage("1")).toBe(false);
	});

	/** Discord sends the bitfield as a string because it does not survive JSON as a number. */
	it("refuses something that is not a bitfield rather than throwing", () => {
		expect(canManage("not a number")).toBe(false);
		expect(canManage("")).toBe(false);
	});
});

describe("asking Discord on somebody's behalf", () => {
	let fetched: jest.SpiedFunction<typeof fetch>;
	const answer = (status: number, headers: Record<string, string> = {}): Response =>
		new Response(status === 200 ? "[]" : "{}", { status, headers });

	beforeEach(() => {
		fetched = jest.spyOn(global, "fetch");
	});
	afterEach(() => fetched.mockRestore());

	/** A short rate limit on the guild list was reported to the owner as Discord being down. */
	it("waits out a short rate limit once and then answers", async () => {
		fetched.mockResolvedValueOnce(answer(429, { "retry-after": "0.01" })).mockResolvedValueOnce(answer(200));

		await expect(fetchGuilds("token")).resolves.toEqual([]);
		expect(fetched).toHaveBeenCalledTimes(2);
	});

	it("does not sit on a long rate limit, and says what Discord answered", async () => {
		const seconds = String(MAX_RETRY_WAIT_MS / 1_000 + 1);
		fetched.mockResolvedValueOnce(answer(429, { "retry-after": seconds }));

		const failure = await fetchGuilds("token").catch((error: unknown) => error);

		expect(failure).toBeInstanceOf(UpstreamProblem);
		expect((failure as UpstreamProblem).upstreamStatus).toBe(429);
		expect(fetched).toHaveBeenCalledTimes(1);
	});

	it("reports an outage with Discord's own status", async () => {
		fetched.mockResolvedValueOnce(answer(503));

		await expect(fetchGuilds("token")).rejects.toMatchObject({ status: 502, upstreamStatus: 503 });
	});

	it("still treats a refused token as signed out rather than as an outage", async () => {
		fetched.mockResolvedValueOnce(answer(401));

		await expect(fetchGuilds("token")).rejects.toMatchObject({ status: 401, code: "unauthenticated" });
	});
});

describe("the OAuth configuration", () => {
	it("is complete when all three settings are present", () => {
		expect(missingSettings(envWith())).toEqual([]);
		expect(oauthConfigFrom(envWith())).not.toBeNull();
	});

	/** Journey 4: enabling the dashboard with nothing filled in must show instructions, not a 500. */
	it("names each missing setting rather than failing", () => {
		const env = envWith({ DISCORD_CLIENT_SECRET: undefined, DASHBOARD_SESSION_SECRET: undefined });

		expect(missingSettings(env)).toEqual(["DISCORD_CLIENT_SECRET", "DASHBOARD_SESSION_SECRET"]);
		expect(oauthConfigFrom(env)).toBeNull();
	});

	it("carries the session TTL through, so the cookie and the document expire together", () => {
		expect(oauthConfigFrom(envWith({ DASHBOARD_SESSION_TTL_DAYS: 3 }))?.sessionTtlDays).toBe(3);
	});
});
