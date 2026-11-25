import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "dotenv";
import { readDashboardEnv } from "./waitForApi";
import { box, colourEnabled, painter } from "@core/terminal";

/** Runs the bot and the dashboard without a shell between them, so one Ctrl+C stops both on Windows too. */

const BOT = "bot";
const WEB = "web";
const COLOURS: Record<string, "magenta" | "cyan"> = { [BOT]: "magenta", [WEB]: "cyan" };
const paint = painter();

const GRACE_MS = 5_000;

/** Shared runs from its source, through its `development` export, so it can never be an old build. */
export const BOT_WATCH = ["watch", "--clear-screen=false", "--conditions=development", "src/index.ts"];

function label(name: string): string {
	const colour = COLOURS[name];
	return colour === undefined || !colourEnabled() ? `[${name}] ` : `${paint.bold(paint[colour](`[${name}]`))} `;
}

/** Labels each line a child writes once, though a chunk can end, and the next begin, partway through a line. */
export function lineLabeller(name: string): (chunk: string) => string {
	let atLineStart = true;

	return (chunk) => {
		let labelled = "";
		for (const piece of chunk.split(/(?<=\n)/)) {
			if (piece === "") continue;
			labelled += atLineStart ? `${label(name)}${piece}` : piece;
			atLineStart = piece.endsWith("\n");
		}
		return labelled;
	};
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

/** macOS cancels a read of a file that iCloud Drive, or another sync client, has not finished downloading. */
export function syncedFolderRead(chunk: string): boolean {
	return chunk.includes("ECANCELED: operation canceled");
}

let toldAboutSync = false;

function pipe(name: string, process_: ChildProcess): void {
	const out = lineLabeller(name);
	const err = lineLabeller(name);
	process_.stdout?.on("data", (chunk: Buffer) => process.stdout.write(out(chunk.toString())));
	process_.stderr?.on("data", (chunk: Buffer) => {
		const text = chunk.toString();
		process.stderr.write(err(text));
		if (toldAboutSync || !syncedFolderRead(text)) return;
		toldAboutSync = true;
		print(
			[
				"macOS cancelled reading a file, which is what a folder kept in sync",
				"by iCloud Drive, Dropbox or Google Drive does while it downloads one.",
				"The same syncing touches files, so the bot keeps restarting too.",
				"With Desktop & Documents on, iCloud syncs ~/Desktop and ~/Documents.",
				"",
				`${paint.cyan("➜")} Move the project somewhere not synced, such as ~/Developer,`,
				"  or rename its folder to end in .nosync, which iCloud leaves alone.",
			],
			"warning",
			"The project folder is being synced",
		);
	});
}

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
	if (!readDashboardEnv(values).enabled) {
		print(
			[
				"SITE_ENABLED is false and DASHBOARD_ENABLED is not true in",
				".env.development, so the bot starts no API for the page to talk to.",
				"",
				`${paint.cyan("➜")} Turn either on, or run ${paint.bold("npm run dev")} for the bot alone.`,
			],
			"warning",
			"The website is switched off",
		);
		return null;
	}

	return values;
}

function main(): void {
	const root = process.cwd();
	const values = readyToStart(resolve(root, ".env.development"));
	if (values === null) process.exit(1);

	print(
		[
			`${label(BOT)}the Discord bot, restarting whenever a file under src/ is saved`,
			`${label(WEB)}the dashboard, started once the bot's API answers`,
			"",
			`The page opens at ${paint.bold(values.DASHBOARD_BASE_URL ?? "http://localhost:5174")}`,
			`${paint.bold("Ctrl+C")} stops both.`,
		],
		"info",
		"Bot and dashboard",
	);

	const tsx = resolve(root, "node_modules/tsx/dist/cli.mjs");
	const children = [
		[BOT, child(tsx, BOT_WATCH)],
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
			if (alive === 0) process.exit(process.exitCode ?? 0);
		});
	}
}

if (process.argv[1]?.includes("devAll")) main();
