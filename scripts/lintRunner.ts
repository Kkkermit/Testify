import { relative } from "node:path";
import { ESLint } from "eslint";
import { painter } from "@core/terminal";

/** `npm run lint`: ESLint over the repository, one block per file, failing on errors and never on warnings. */

const paint = painter();

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

export function exitCodeFor(totals: LintTotals): number {
	return totals.errors > 0 ? 1 : 0;
}

export function summarise(totals: LintTotals): string {
	if (totals.errors === 0 && totals.warnings === 0) return paint.green("No problems found.");

	const parts = [
		totals.errors > 0 ? paint.red(`${totals.errors} error(s)`) : "",
		totals.warnings > 0 ? paint.yellow(`${totals.warnings} warning(s)`) : "",
	].filter(Boolean);

	const fixable = totals.fixable > 0 ? paint.dim(` — ${totals.fixable} fixable with --fix`) : "";
	return `${parts.join(", ")} across ${totals.files} file(s)${fixable}`;
}

async function main(): Promise<void> {
	const fix = process.argv.includes("--fix");
	const eslint = new ESLint({ fix });
	const results = await eslint.lintFiles(["."]);

	if (fix) await ESLint.outputFixes(results);

	for (const result of results) {
		if (result.errorCount + result.warningCount === 0) continue;

		console.log(`\n${paint.bold(relative(process.cwd(), result.filePath))}`);

		for (const message of result.messages) {
			const level = message.severity === 2 ? paint.red("error") : paint.yellow("warn ");
			// Padded before it is coloured, since the colour codes would count towards the width.
			const where = paint.dim(`${message.line}:${message.column}`.padEnd(8));
			console.log(`  ${where} ${level}  ${message.message}  ${paint.cyan(message.ruleId ?? "")}`);
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
