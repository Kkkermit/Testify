import { execFile } from "node:child_process";
import { promisify } from "node:util";
import prompts from "prompts";

const run = promisify(execFile);

/**
 * `npm run commit` — the guided way to write a commit in the house format.
 *
 * The commit-msg hook is what enforces the convention; this just makes it
 * pleasant. The message is passed to git as an argv element, never interpolated
 * into a shell string, so a quote or a backtick in the subject is harmless.
 */

const TYPES = [
	{ value: "feat", title: "feat", description: "A new feature" },
	{ value: "fix", title: "fix", description: "A bug fix" },
	{ value: "docs", title: "docs", description: "Documentation changes" },
	{ value: "style", title: "style", description: "Code style changes (formatting, etc)" },
	{ value: "refactor", title: "refactor", description: "Code refactoring with no feature changes" },
	{ value: "perf", title: "perf", description: "Performance improvements" },
	{ value: "test", title: "test", description: "Adding or updating tests" },
	{ value: "chore", title: "chore", description: "Maintenance tasks, dependency updates" },
	{ value: "add", title: "add", description: "Adding new features or files" },
	{ value: "update", title: "update", description: "Updating existing features or files" },
	{ value: "remove", title: "remove", description: "Removing features or files" },
];

/** `added the thing` -> `Added the thing`, and no trailing full stop. */
export function formatSubject(input: string): string {
	const trimmed = input.trim().replace(/\.+$/, "");
	return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function buildMessage(type: string, subject: string): string {
	return `${type}: ${formatSubject(subject)}`;
}

async function stagedFileCount(): Promise<number> {
	const { stdout } = await run("git", ["diff", "--cached", "--name-only"]);
	return stdout.split("\n").filter(Boolean).length;
}

async function main(): Promise<void> {
	const staged = await stagedFileCount();

	if (staged === 0) {
		console.log("Nothing is staged. Use `git add` first.");
		process.exitCode = 1;
		return;
	}

	console.log(`\n  ${staged} file(s) staged.\n`);

	const answers = await prompts(
		[
			{ type: "select", name: "type", message: "Type of change", choices: TYPES, initial: 0 },
			{
				type: "text",
				name: "subject",
				message: "Subject",
				validate: (value: string) => (value.trim().length > 0 ? true : "A subject is required."),
			},
		],
		{ onCancel: () => process.exit(1) },
	);

	const message = buildMessage(answers.type as string, answers.subject as string);

	const { confirmed } = await prompts({
		type: "confirm",
		name: "confirmed",
		message: `Commit as "${message}"?`,
		initial: true,
	});

	if (confirmed !== true) {
		console.log("Cancelled. Nothing was committed.");
		return;
	}

	// An argv array, not a shell string — a quote or a $ in the subject is data.
	await run("git", ["commit", "-m", message]);
	console.log(`\nCommitted: ${message}`);
}

if (require.main === module) {
	main().catch((error: unknown) => {
		console.error(error);
		process.exitCode = 1;
	});
}
