import { getConnInfo } from "@hono/node-server/conninfo";
import { type Context } from "hono";
import { createMiddleware } from "hono/factory";
import { type ApiBindings } from "@api/context";
import { SESSION_COOKIE, readCookie } from "@api/cookies";
import { tooManyRequests } from "@api/errors";

export interface RateLimitOptions {
	/** How many requests one caller may make inside the window. */
	limit: number;
	windowMs: number;
	/** Distinguishes buckets, so a spent sign-in allowance does not also block reading a page. */
	name: string;
}

interface Window {
	count: number;
	resetAt: number;
}

/**
 * Fixed-window counting in memory. It is deliberately not shared across processes: a bot runs as one process,
 * and reaching for Redis to rate-limit a self-hosted dashboard would cost the "one process, one command"
 * promise the whole design is built on.
 */
export class RateLimiter {
	private readonly windows = new Map<string, Window>();
	private readonly limit: number;
	private readonly windowMs: number;

	/** Without a bound, a flood of one-off keys is a memory leak with a rate limiter's name on it. */
	private readonly maxKeys: number;

	constructor(options: { limit: number; windowMs: number; maxKeys?: number }) {
		this.limit = options.limit;
		this.windowMs = options.windowMs;
		this.maxKeys = options.maxKeys ?? 10_000;
	}

	check(key: string, now = Date.now()): { allowed: boolean; retryAfterMs: number } {
		const existing = this.windows.get(key);

		if (existing === undefined || existing.resetAt <= now) {
			if (this.windows.size >= this.maxKeys) this.sweep(now);
			this.windows.set(key, { count: 1, resetAt: now + this.windowMs });
			return { allowed: true, retryAfterMs: 0 };
		}

		existing.count += 1;
		if (existing.count <= this.limit) return { allowed: true, retryAfterMs: 0 };

		return { allowed: false, retryAfterMs: existing.resetAt - now };
	}

	sweep(now = Date.now()): void {
		for (const [key, window] of this.windows) {
			if (window.resetAt <= now) this.windows.delete(key);
		}

		// Everything is still live, so the bound is real traffic rather than stale keys. Drop the oldest.
		if (this.windows.size >= this.maxKeys) {
			const oldest = [...this.windows.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
			for (const [key] of oldest.slice(0, Math.ceil(this.maxKeys / 4))) this.windows.delete(key);
		}
	}

	get size(): number {
		return this.windows.size;
	}
}

/**
 * A session id identifies a caller far better than an address does, since a household shares one address. The
 * address is the fallback for anyone not signed in, which is exactly who a sign-in flood comes from.
 */
export function callerKey(context: Context, trustProxy: boolean): string {
	const session = readCookie(context, SESSION_COOKIE);
	if (session !== null && session !== "") return `s:${session}`;

	return `i:${clientAddress(context, trustProxy)}`;
}

export function clientAddress(context: Context, trustProxy: boolean): string {
	if (trustProxy) {
		// Only meaningful behind a proxy that overwrites this. Trusting it without one lets anyone forge it,
		// which is why DASHBOARD_TRUST_PROXY defaults to false.
		const forwarded = context.req.header("x-forwarded-for");
		const first = forwarded?.split(",")[0]?.trim();
		if (first !== undefined && first !== "") return first;
	}

	try {
		return getConnInfo(context).remote.address ?? "unknown";
	} catch {
		// `app.request()` in a test has no socket behind it.
		return "unknown";
	}
}

export function rateLimit(
	limiter: RateLimiter,
	options: Pick<RateLimitOptions, "name"> & { trustProxy: boolean },
): ReturnType<typeof createMiddleware<ApiBindings>> {
	return createMiddleware<ApiBindings>(async (context, next) => {
		const { allowed, retryAfterMs } = limiter.check(`${options.name}:${callerKey(context, options.trustProxy)}`);

		if (!allowed) throw tooManyRequests(Math.max(1, Math.ceil(retryAfterMs / 1_000)));

		await next();
	});
}
