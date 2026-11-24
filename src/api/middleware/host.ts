import { isIP } from "node:net";
import { createMiddleware } from "hono/factory";
import { type ApiBindings } from "@api/context";
import { ApiProblem } from "@api/errors";
import { type Env } from "@config/env";

/** Names public DNS never answers, so no other site can point one of them at this machine. */
const PRIVATE_SUFFIXES = [".localhost", ".local", ".internal", ".home.arpa"];

/** Only the first few refused names are logged by name, so a scanner sending made-up ones cannot fill the log. */
const NAMED_REFUSALS = 20;

/**
 * A site that points its own domain at this machine reaches it under that domain, so the only public name answered is
 * `DASHBOARD_BASE_URL`'s; an address, a one-word name and a private suffix are how a proxy or this machine reach it.
 */
export function servesHost(hostname: string, env: Pick<Env, "DASHBOARD_BASE_URL" | "DASHBOARD_BIND">): boolean {
	if (env.DASHBOARD_BASE_URL === undefined) return true;

	const name = hostname.toLowerCase().replace(/\.$/, "");
	if (name === new URL(env.DASHBOARD_BASE_URL).hostname.toLowerCase()) return true;
	if (name === env.DASHBOARD_BIND.toLowerCase()) return true;
	if (isIP(name.replace(/^\[(.*)\]$/, "$1")) !== 0) return true;
	if (!name.includes(".")) return true;

	return PRIVATE_SUFFIXES.some((suffix) => name.endsWith(suffix));
}

export function refuseUnknownHost(env: Env): ReturnType<typeof createMiddleware<ApiBindings>> {
	const named = new Set<string>();

	return createMiddleware<ApiBindings>(async (context, next) => {
		// A host's own health check asks by whatever name reaches the port, and its answer is public anyway.
		if (context.req.path === "/api/health") {
			await next();
			return;
		}

		const hostname = new URL(context.req.url).hostname;

		if (!servesHost(hostname, env)) {
			if (named.size < NAMED_REFUSALS && !named.has(hostname)) {
				named.add(hostname);
				context
					.get("client")
					.logger.warn(
						{ host: hostname },
						"[API] Refused a request addressed to a name this server does not answer to. If people reach the dashboard there, set DASHBOARD_BASE_URL to it.",
					);
			}
			throw new ApiProblem(421, "unknown_host", "This server does not answer to that address.");
		}

		await next();
	});
}
