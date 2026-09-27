import { createMiddleware } from "hono/factory";
import { type ApiBindings } from "@api/context";
import { type Env } from "@config/env";

/**
 * The Content-Security-Policy; `script-src 'self'` with no `'unsafe-inline'` or `'unsafe-eval'` is what stops injected
 * script running.
 */
const CSP = [
	"default-src 'self'",
	// Avatars and guild icons.
	"img-src 'self' https://cdn.discordapp.com data:",
	"script-src 'self'",
	// Tailwind and Radix set inline styles. A style injection cannot execute script under this policy.
	"style-src 'self' 'unsafe-inline'",
	"font-src 'self' data:",
	"connect-src 'self'",
	"object-src 'none'",
	"frame-src 'none'",
	// Clickjacking matters here: one framed click can wipe a guild's economy.
	"frame-ancestors 'none'",
	"base-uri 'none'",
	"form-action 'self'",
].join("; ");

export function securityHeaders(env: Env): ReturnType<typeof createMiddleware<ApiBindings>> {
	const overTls = env.DASHBOARD_BASE_URL?.startsWith("https://") === true;

	return createMiddleware<ApiBindings>(async (context, next) => {
		await next();

		context.header("Content-Security-Policy", CSP);
		// Belt and braces for browsers that predate frame-ancestors.
		context.header("X-Frame-Options", "DENY");
		// Stops a JSON response being sniffed as HTML and executed.
		context.header("X-Content-Type-Options", "nosniff");
		context.header("Referrer-Policy", "no-referrer");
		context.header("Cross-Origin-Opener-Policy", "same-origin");
		context.header("Cross-Origin-Resource-Policy", "same-origin");
		context.header("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
		// robots.txt asks a crawler not to look; this asks one that looked not to keep what it found.
		context.header("X-Robots-Tag", "noindex, nofollow, noarchive");

		// Sending HSTS over plain HTTP would pin a self-hoster's localhost to a scheme it cannot serve.
		if (overTls) context.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

		// An authenticated response must never sit in a shared cache.
		if (context.req.path.startsWith("/api/")) context.header("Cache-Control", "no-store");
	});
}
