import { ESLint } from "eslint";

/**
 * `npm run lint` — a per-file report, and one rule that matters:
 * **errors fail the build, warnings never do.**
 *
 * A warning exists to be seen, not to stop work. Plain `eslint .` exits
 * non-zero on either unless you remember `--max-warnings`, which turns every
 * new advisory rule into a broken pipeline.
 */

const colour = {
	reset: "\u001b[0m",
	bold: "\u001b[1m",
	dim: "\u001b[2m",
	red: "\u001b[31m",
	yellow: "\u001b[33m",
	green: "\u001b[32m",
	cyan: "\u001b[36m",
};

const paint = (code: string, text: string): string =>
	process.stdout.isTTY === true ? `${code}${text}${colour.reset}` : text;

export interface LintTotals {
	files: number;
	errors: number;
	warnings: number;
	fixable: number;
}

export function totalsOf(results: ESLint.LintResult[]): LintTotals {
	return results.reduce<LintTotals>(
		(totals, result) => ({
			files: totals.files + (result.errorCount + result.warningCount > 0 ? 1 : 0),
			errors: totals.errors + result.errorCount,
			warnings: totals.warnings + result.warningCount,
			fixable: totals.fixable + result.fixableErrorCount + result.fixableWarningCount,
		}),
		{ files: 0, errors: 0, warnings: 0, fixable: 0 },
	);
}

/** Errors fail; warnings are reported and forgiven. */
export function exitCodeFor(totals: LintTotals): number {
	return totals.errors > 0 ? 1 : 0;
}

export function summarise(totals: LintTotals): string {
	if (totals.errors === 0 && totals.warnings === 0) return paint(colour.green, "No problems found.");

	const parts = [
		totals.errors > 0 ? paint(colour.red, `${totals.errors} error(s)`) : "",
		totals.warnings > 0 ? paint(colour.yellow, `${totals.warnings} warning(s)`) : "",
	].filter(Boolean);

	const fixable = totals.fixable > 0 ? paint(colour.dim, ` — ${totals.fixable} fixable with --fix`) : "";
	return `${parts.join(", ")} across ${totals.files} file(s)${fixable}`;
}

async function main(): Promise<void> {
	const fix = process.argv.includes("--fix");
	const eslint = new ESLint({ fix });
	const results = await eslint.lintFiles(["."]);

	if (fix) await ESLint.outputFixes(results);

	for (const result of results) {
		if (result.errorCount + result.warningCount === 0) continue;

		console.log(`\n${paint(colour.bold, result.filePath.replace(`${process.cwd()}/`, ""))}`);

		for (const message of result.messages) {
			const level = message.severity === 2 ? paint(colour.red, "error") : paint(colour.yellow, "warn ");
			const where = paint(colour.dim, `${message.line}:${message.column}`);
			const rule = paint(colour.cyan, message.ruleId ?? "");
			console.log(`  ${where.padEnd(18)} ${level}  ${message.message}  ${rule}`);
		}
	}

	const totals = totalsOf(results);
	console.log(`\n${summarise(totals)}\n`);

	process.exitCode = exitCodeFor(totals);
}

if (require.main === module) {
	main().catch((error: unknown) => {
		console.error(error);
		process.exitCode = 1;
	});
}
