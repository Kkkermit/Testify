import { type Context, Hono } from "hono";
import {
	clearAuthCookies,
	CSRF_COOKIE,
	OAUTH_COOKIE,
	readCookie,
	SESSION_COOKIE,
	setCsrfCookie,
	setOauthCookie,
	setSessionCookie,
} from "@api/cookies";
import { type Env } from "@config/env";

const PRODUCTION = { NODE_ENV: "production" } as Env;
const DEVELOPMENT = { NODE_ENV: "development" } as Env;

async function headersFrom(write: (context: Context) => void): Promise<string[]> {
	const app = new Hono();
	app.get("/", (context) => {
		write(context);
		return context.text("ok");
	});

	return (await app.request("/")).headers.getSetCookie();
}

describe("the session cookie", () => {
	/** HttpOnly is what makes an XSS bug in a dependency cost a defaced page rather than the bot. */
	it("cannot be read by script, and is not sent cross-site", async () => {
		const [cookie = ""] = await headersFrom((context) => {
			setSessionCookie(context, PRODUCTION, "the-session-id", 604_800);
		});

		expect(cookie).toContain(`${SESSION_COOKIE}=the-session-id`);
		expect(cookie).toContain("HttpOnly");
		expect(cookie).toContain("SameSite=Lax");
		expect(cookie).toContain("Path=/");
		expect(cookie).toContain("Max-Age=604800");
	});

	it("is Secure in production", async () => {
		const [cookie = ""] = await headersFrom((context) => {
			setSessionCookie(context, PRODUCTION, "id", 60);
		});

		expect(cookie).toContain("Secure");
	});

	/**
	 * `Secure` on `http://localhost` means the browser silently drops it and the sign-in loops. That single
	 * line is the most common self-hosting trip-up there is.
	 */
	it("is not Secure in development, or nothing works on localhost", async () => {
		const [cookie = ""] = await headersFrom((context) => {
			setSessionCookie(context, DEVELOPMENT, "id", 60);
		});

		expect(cookie).not.toContain("Secure");
	});

	/** `Strict` is dropped on the redirect back from Discord, and the sign-in fails with no error. */
	it("is Lax rather than Strict", async () => {
		const [cookie = ""] = await headersFrom((context) => {
			setSessionCookie(context, PRODUCTION, "id", 60);
		});

		expect(cookie).toContain("SameSite=Lax");
		expect(cookie).not.toContain("SameSite=Strict");
		expect(cookie).not.toContain("SameSite=None");
	});
});

describe("the CSRF cookie", () => {
	/** Deliberately readable: the SPA echoes it in a header, which is the whole double-submit mechanism. */
	it("is readable by script, and still carries every other flag", async () => {
		const [cookie = ""] = await headersFrom((context) => {
			setCsrfCookie(context, PRODUCTION, "the-secret", 604_800);
		});

		expect(cookie).toContain(`${CSRF_COOKIE}=the-secret`);
		expect(cookie).not.toContain("HttpOnly");
		expect(cookie).toContain("SameSite=Lax");
		expect(cookie).toContain("Secure");
	});
});

describe("the OAuth cookie", () => {
	/** It holds the in-flight `state` and PKCE verifier, and a long life is a long window to replay one in. */
	it("is short-lived and unreadable", async () => {
		const [cookie = ""] = await headersFrom((context) => {
			setOauthCookie(context, PRODUCTION, "state-and-verifier");
		});

		expect(cookie).toContain(`${OAUTH_COOKIE}=`);
		expect(cookie).toContain("HttpOnly");
		expect(cookie).toContain("Max-Age=600");
	});
});

describe("clearing", () => {
	it("removes all three, so signing out leaves nothing behind", async () => {
		const cookies = await headersFrom((context) => {
			clearAuthCookies(context, PRODUCTION);
		});

		for (const name of [SESSION_COOKIE, CSRF_COOKIE, OAUTH_COOKIE]) {
			expect(cookies.some((cookie) => cookie.startsWith(`${name}=`))).toBe(true);
		}
		expect(cookies.every((cookie) => cookie.includes("Max-Age=0"))).toBe(true);
	});
});

describe("readCookie", () => {
	it("finds one that was sent and returns null for one that was not", async () => {
		const app = new Hono();
		app.get("/", (context) =>
			context.json({
				session: readCookie(context, SESSION_COOKIE),
				missing: readCookie(context, "nope"),
			}),
		);

		const response = await app.request("/", { headers: { cookie: `${SESSION_COOKIE}=abc` } });

		expect(await response.json()).toEqual({ session: "abc", missing: null });
	});
});
