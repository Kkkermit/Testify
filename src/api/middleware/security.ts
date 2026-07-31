import { createMiddleware } from "hono/factory";
import { type ApiBindings } from "@api/context";
import { type Env } from "@config/env";

/**
 * The Content-Security-Policy that makes an XSS bug in a dependency cost a defaced page rather than the bot.
 *
 * `script-src 'self'` with no `'unsafe-inline'` and no `'unsafe-eval'` is the line that matters: an injected
 * `<script>` or an `onerror=` attribute will not execute. Vite's production build emits external modules only,
 * so nothing here needs loosening — in development the page is served by Vite, not by this, so its HMR client
 * is unaffected.
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

		// Sending HSTS over plain HTTP would pin a self-hoster's localhost to a scheme it cannot serve.
		if (overTls) context.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

		// An authenticated response must never sit in a shared cache.
		if (context.req.path.startsWith("/api/")) context.header("Cache-Control", "no-store");
	});
}
