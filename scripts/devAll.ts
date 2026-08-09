import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";

/**
 * Runs the bot and the dashboard together, and stops both on one Ctrl+C.
 *
 * `concurrently "npm:dev" "npm:dashboard:dev"` did this until Windows made it two Ctrl+Cs and a pair of
 * "Terminate batch job (Y/N)?" prompts: every `npm run` there is a `cmd.exe` running `npm.cmd`, the console
 * sends its interrupt to the whole process group, and each batch layer stops to ask. Spawning the real
 * binaries with no shell removes the batch layer, so there is nothing left to ask.
 */

const BOT = "bot";
const WEB = "web";
const COLOURS: Record<string, string> = { [BOT]: "[35m", [WEB]: "[36m" };
const RESET = "[0m";

/** How long a child gets to stop politely before it is killed outright. */
const GRACE_MS = 5_000;

/** Colour is dropped when the output is being piped, the same rule the boot banner follows. */
function label(name: string): string {
	return process.stdout.isTTY ? `${COLOURS[name] ?? ""}[${name}]${RESET} ` : `[${name}] `;
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
		env: { ...process.env, NODE_ENV: "development", FORCE_COLOR: process.stdout.isTTY ? "1" : "0" },
	});
}

function pipe(name: string, process_: ChildProcess): void {
	process_.stdout?.on("data", (chunk: Buffer) => process.stdout.write(prefixLines(name, chunk.toString())));
	process_.stderr?.on("data", (chunk: Buffer) => process.stderr.write(prefixLines(name, chunk.toString())));
}

/**
 * Signals the whole tree, not just the process we spawned.
 *
 * Both halves start something else — `tsx watch` runs the bot in a grandchild, and the web child runs Vite in
 * one — so signalling only the child we hold leaves the thing actually holding the port alive. A Windows
 * process has no group to signal, which is what `taskkill /T` is for.
 */
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

function main(): void {
	const root = process.cwd();

	// Built before anything starts: `tsx` resolves `@testify/shared` to its `dist`, so a stale one turns every
	// route that validates into a 500 naming only `safeParse`. It takes about 40ms.
	const shared = spawnSync(process.execPath, [resolve(root, "node_modules/tsup/dist/cli-default.js")], {
		cwd: resolve(root, "shared"),
		stdio: "inherit",
	});
	if (shared.status !== 0) {
		process.stderr.write("\nCould not build @testify/shared. Run `npm run build:shared` to see why.\n");
		process.exit(1);
	}

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

		for (const [, process_] of children) stopTree(process_);

		// Nothing may hang the terminal: whatever has not gone by now is killed and we leave.
		setTimeout(() => {
			for (const [, process_] of children) stopTree(process_, "SIGKILL");
			process.exit(process.exitCode ?? 0);
		}, GRACE_MS).unref();
	}

	process.on("SIGINT", stopAll);
	process.on("SIGTERM", stopAll);

	for (const [name, process_] of children) {
		process_.on("exit", (code) => {
			if (!stopping) process.stdout.write(`${label(name)}stopped, so the other half is stopping too.\n`);
			if (process.exitCode === undefined && code !== null && code !== 0) process.exitCode = code;

			stopAll();
			alive -= 1;
			// Both gone, so there is nothing left to supervise — exit rather than sit on an empty event loop.
			if (alive === 0) process.exit(process.exitCode ?? 0);
		});
	}
}

if (process.argv[1]?.includes("devAll")) main();
