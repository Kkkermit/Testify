import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { main as waitForApi } from "./waitForApi";

/** Waits for the bot's API, then starts Vite in the same process. */

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
