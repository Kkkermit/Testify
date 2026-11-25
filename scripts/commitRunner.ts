import { execFile } from "node:child_process";
import { promisify } from "node:util";
import prompts from "prompts";

const run = promisify(execFile);

/** `npm run commit`: a guided commit in the house format, passed to git as an argv element. */

export const TYPES = [
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

export function formatSubject(input: string): string {
	const trimmed = input.trim().replace(/\.+$/, "");
	return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function buildMessage(type: string, subject: string): string {
	return `${type}: ${formatSubject(subject)}`;
}

/** commitlint.config.mjs's `header-max-length`. */
const HEADER_MAX = 100;

/** Why commitlint would refuse this subject, asked as it is typed rather than after the commit is attempted. */
export function subjectProblem(type: string, subject: string): string | null {
	if (formatSubject(subject).length === 0) return "A subject is required.";
	const length = buildMessage(type, subject).length;
	return length > HEADER_MAX
		? `That makes the line ${String(length)} characters; ${String(HEADER_MAX)} at most.`
		: null;
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

	const onCancel = (): never => process.exit(1);
	const { type } = (await prompts(
		{ type: "select", name: "type", message: "Type of change", choices: TYPES, initial: 0 },
		{ onCancel },
	)) as { type: string };
	const { subject } = (await prompts(
		{
			type: "text",
			name: "subject",
			message: "Subject",
			validate: (value: string) => subjectProblem(type, value) ?? true,
		},
		{ onCancel },
	)) as { subject: string };

	const message = buildMessage(type, subject);

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
