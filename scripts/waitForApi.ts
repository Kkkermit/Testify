import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";

/**
 * Holds the dashboard back until the bot's API answers.
 *
 * `startApi` runs after `client.login()`, so the API is not listening for the twenty-odd seconds the bot spends
 * connecting to Discord — and Vite's proxy answers every request in that window with a wall of ECONNREFUSED
 * that reads like a broken install rather than a slow start.
 *
 * Deliberately not `wait-on` or another dependency: this is a `fetch` in a loop, and an open-source bot should
 * not need one more install to run its own dev script.
 */

const POLL_MS = 500;

/** Generous, because a first run compiles the whole bot before it even reaches `client.login()`. */
export function timeoutMs(argv: string[], fallback = 180_000): number {
	const index = argv.indexOf("--timeout");
	const given = index === -1 ? Number.NaN : Number(argv[index + 1]);

	return Number.isFinite(given) && given > 0 ? given : fallback;
}

export interface DashboardEnv {
	enabled: boolean;
	port: number;
}

/** A blank or nonsense port is the env.ts default rather than a crash — this script must not be the thing that fails. */
export function readDashboardEnv(source: Record<string, string | undefined>): DashboardEnv {
	const port = Number(source.DASHBOARD_PORT);

	return {
		enabled: source.DASHBOARD_ENABLED === "true",
		port: Number.isInteger(port) && port > 0 && port <= 65_535 ? port : 3_000,
	};
}

/** The same file the bot reads. `loadEnv()` would fail over a token this script has no opinion about. */
function fromEnvFile(): DashboardEnv {
	const file = resolve(process.cwd(), process.env.NODE_ENV === "development" ? ".env.development" : ".env");
	if (existsSync(file)) loadDotenv({ path: file, quiet: true });

	return readDashboardEnv(process.env);
}

async function answering(url: string): Promise<boolean> {
	try {
		return (await fetch(url, { signal: AbortSignal.timeout(2_000) })).ok;
	} catch {
		// Refused, reset or timed out: the bot is still starting, which is the case this script exists for.
		return false;
	}
}

export async function main(): Promise<void> {
	const { enabled, port } = fromEnvFile();

	if (!enabled) {
		process.stderr.write(
			"\nDASHBOARD_ENABLED is false, so the bot never starts an API for the dashboard to talk to.\n" +
				"Set DASHBOARD_ENABLED=true in .env.development, or run `npm run dev` for the bot on its own.\n\n",
		);
		process.exitCode = 1;
		return;
	}

	const limit = timeoutMs(process.argv.slice(2));
	const url = `http://127.0.0.1:${String(port)}/api/health`;
	const deadline = Date.now() + limit;
	let announced = false;

	while (Date.now() < deadline) {
		if (await answering(url)) {
			process.stdout.write(`API is up on port ${String(port)}. Starting Vite.\n`);
			return;
		}

		if (!announced) {
			process.stdout.write(`Waiting for the bot's API on port ${String(port)} before starting Vite…\n`);
			announced = true;
		}

		await new Promise((sleep) => setTimeout(sleep, POLL_MS));
	}

	process.stderr.write(
		`\nThe bot's API never came up on port ${String(port)} within ${String(Math.round(limit / 1000))}s.\n` +
			"Look at the [bot] output above — it usually says what stopped it.\n\n",
	);
	process.exitCode = 1;
}

if (require.main === module) void main();
