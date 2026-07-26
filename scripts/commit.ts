import { execFileSync } from "node:child_process";
import prompts from "prompts";

const TYPES = ["feat", "fix", "docs", "style", "refactor", "perf", "test", "chore"];

/**
 * The previous helper interpolated the commit message into an `exec()` shell
 * string, so a quote or `$(…)` in the message executed. `execFileSync` passes
 * arguments directly, with no shell involved.
 */
async function main(): Promise<void> {
	const { type } = await prompts({
		type: "select",
		name: "type",
		message: "Commit type",
		choices: TYPES.map((value) => ({ title: value, value })),
	});

	if (typeof type !== "string") {
		console.log("Cancelled.");
		return;
	}

	const { scope } = await prompts({ type: "text", name: "scope", message: "Scope (optional)" });
	const { summary } = await prompts({ type: "text", name: "summary", message: "Summary" });

	if (typeof summary !== "string" || summary.trim().length === 0) {
		console.error("A summary is required.");
		process.exitCode = 1;
		return;
	}

	const header =
		typeof scope === "string" && scope.trim().length > 0
			? `${type}(${scope.trim()}): ${summary.trim()}`
			: `${type}: ${summary.trim()}`;

	execFileSync("git", ["commit", "-m", header], { stdio: "inherit" });
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
