import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "dotenv";
import { resolveBotName } from "../shared/src/brand";
import { box, colourEnabled, painter } from "@core/terminal";

/** Runs the bot and the dashboard without a shell between them, so one Ctrl+C stops both on Windows too. */

const BOT = "bot";
const WEB = "web";
const COLOURS: Record<string, "magenta" | "cyan"> = { [BOT]: "magenta", [WEB]: "cyan" };
const paint = painter();

/** How long a child gets to stop politely before it is killed outright. */
const GRACE_MS = 5_000;

/** Colour is dropped when the output is being piped, the same rule the boot banner follows. */
function label(name: string): string {
	const colour = COLOURS[name];
	return colour === undefined || !colourEnabled() ? `[${name}] ` : `${paint.bold(paint[colour](`[${name}]`))} `;
}

export function prefixLines(name: string, chunk: string): string {
	const lines = chunk.split("\n");
	const last = lines.pop() ?? "";

	return lines.map((line) => `${label(name)}${line}\n`).join("") + (last === "" ? "" : `${label(name)}${last}`);
}

function child(script: string, args: string[]): ChildProcess {
	return spawn(process.execPath, [script, ...args], {
		// No shell, deliberately: a shell on Windows is the `cmd.exe` that prompts on Ctrl+C.
		shell: false,
		// Its own process group on POSIX, so one signal reaches the grandchildren `tsx watch` and Vite spawn.
		detached: process.platform !== "win32",
		stdio: ["ignore", "pipe", "pipe"],
		env: { ...process.env, NODE_ENV: "development", FORCE_COLOR: colourEnabled() ? "1" : "0" },
	});
}

function pipe(name: string, process_: ChildProcess): void {
	process_.stdout?.on("data", (chunk: Buffer) => process.stdout.write(prefixLines(name, chunk.toString())));
	process_.stderr?.on("data", (chunk: Buffer) => process.stderr.write(prefixLines(name, chunk.toString())));
}

/** Signals the whole process tree, since both halves run their real work in a grandchild. */
export function stopTree(target: ChildProcess, signal: NodeJS.Signals = "SIGTERM"): void {
	if (target.pid === undefined || target.exitCode !== null || target.signalCode !== null) return;

	if (process.platform === "win32") {
		spawnSync("taskkill", ["/pid", String(target.pid), "/T", "/F"], { stdio: "ignore" });
		return;
	}

	try {
		// A negative pid is the process group, which is why the children are spawned detached.
		process.kill(-target.pid, signal);
	} catch {
		// The group is already gone; the child alone is all that is left to try.
		target.kill(signal);
	}
}

function print(lines: string[], tone: "info" | "warning" | "error", title: string): void {
	process.stdout.write(
		`\n${box(title, lines, tone, paint)
			.map((line) => `  ${line}`)
			.join("\n")}\n\n`,
	);
}

/** Both halves read this file, so a missing one or a dashboard switched off is said once here rather than twice. */
function readyToStart(file: string): Record<string, string> | null {
	if (!existsSync(file)) {
		print(
			[
				"There is no .env.development yet, which is what both halves read.",
				"",
				`${paint.cyan("➜")} ${paint.bold("npm run setup -- --dev")} asks for each value and writes it.`,
			],
			"warning",
			"Not set up yet",
		);
		return null;
	}

	const values = parse(readFileSync(file));
	if (values.DASHBOARD_ENABLED !== "true") {
		print(
			[
				"DASHBOARD_ENABLED is not true in .env.development, so the bot starts",
				"no API for the dashboard to talk to.",
				"",
				`${paint.cyan("➜")} Set ${paint.bold("DASHBOARD_ENABLED=true")}, or run ${paint.bold("npm run dev")} for the bot alone.`,
			],
			"warning",
			"The dashboard is switched off",
		);
		return null;
	}

	return values;
}

function main(): void {
	const root = process.cwd();
	const values = readyToStart(resolve(root, ".env.development"));
	if (values === null) process.exit(1);

	// Build shared first: `tsx` resolves it to its `dist`, and a stale one breaks every validating route.
	const shared = spawnSync(process.execPath, [resolve(root, "node_modules/tsup/dist/cli-default.js")], {
		cwd: resolve(root, "shared"),
		stdio: "pipe",
	});
	if (shared.status !== 0) {
		process.stderr.write(`${shared.stdout.toString()}${shared.stderr.toString()}`);
		print(["Run `npm run build:shared` on its own to see why."], "error", "Could not build @testify/shared");
		process.exit(1);
	}

	print(
		[
			`${label(BOT)}the Discord bot, restarting whenever a file under src/ is saved`,
			`${label(WEB)}the dashboard, started once the bot's API answers`,
			"",
			`The page opens at ${paint.bold(values.DASHBOARD_BASE_URL ?? "http://localhost:5174")}`,
			`${paint.bold("Ctrl+C")} stops both.`,
		],
		"info",
		`${resolveBotName(values.BOT_NAME)} · bot and dashboard`,
	);

	const tsx = resolve(root, "node_modules/tsx/dist/cli.mjs");
	const children = [
		[BOT, child(tsx, ["watch", "--clear-screen=false", "src/index.ts"])],
		[WEB, child(tsx, ["scripts/devWeb.ts"])],
	] as const;

	for (const [name, process_] of children) pipe(name, process_);

	let stopping = false;
	let alive = children.length;

	function stopAll(): void {
		// A second Ctrl+C while the first teardown is still running would start a second one.
		if (stopping) return;
		stopping = true;

		// SIGINT, as a Ctrl+C in either half's own terminal would be; a SIGTERM reads as a save to the bot.
		for (const [, process_] of children) stopTree(process_, "SIGINT");

		// Whatever has not exited by now is killed.
		setTimeout(() => {
			for (const [, process_] of children) stopTree(process_, "SIGKILL");
			process.exit(process.exitCode ?? 0);
		}, GRACE_MS).unref();
	}

	process.on("SIGINT", stopAll);
	process.on("SIGTERM", stopAll);

	for (const [name, process_] of children) {
		process_.on("exit", (code) => {
			if (!stopping)
				process.stdout.write(`${label(name)}${paint.yellow("stopped, so the other half is stopping too.")}\n`);
			if (process.exitCode === undefined && code !== null && code !== 0) process.exitCode = code;

			stopAll();
			alive -= 1;
			// Both gone, so there is nothing left to supervise — exit rather than sit on an empty event loop.
			if (alive === 0) process.exit(process.exitCode ?? 0);
		});
	}
}

if (process.argv[1]?.includes("devAll")) main();
