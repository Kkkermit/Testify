import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { main as waitForApi } from "./waitForApi";

/**
 * Waits for the bot's API, then starts Vite — as one process, so the supervisor has one child to stop rather
 * than a shell holding another shell.
 */

async function main(): Promise<void> {
	await waitForApi();

	const vite = spawn(process.execPath, [resolve(process.cwd(), "node_modules/vite/bin/vite.js")], {
		cwd: resolve(process.cwd(), "dashboard"),
		shell: false,
		stdio: "inherit",
	});

	vite.on("exit", (code) => {
		process.exit(code ?? 0);
	});
}

void main();
