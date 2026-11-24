import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { main as waitForApi } from "./waitForApi";

/** Waits for the bot's API, then starts Vite in the same process. */

const dashboard = resolve(process.cwd(), "dashboard");

/** Vite is the dashboard's dependency, so it is found from there, wherever npm put it. */
const vite = join(
	dirname(createRequire(join(dashboard, "package.json")).resolve("vite/package.json")),
	"bin",
	"vite.js",
);

async function main(): Promise<void> {
	await waitForApi();

	const child = spawn(process.execPath, [vite], { cwd: dashboard, shell: false, stdio: "inherit" });

	child.on("exit", (code) => {
		process.exit(code ?? 0);
	});
}

void main();
