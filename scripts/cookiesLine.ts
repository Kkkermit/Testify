import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cookiesAsLine, looksLikeCookies } from "../src/lib/music/musicBinaries.util";
import { painter, stepLine } from "@core/terminal";

const paint = painter();

/** Turns an exported cookies.txt into the one line `MUSIC_YTDLP_COOKIES` takes on a host like Railway. */

const KEY = "MUSIC_YTDLP_COOKIES";

/** The line to paste, or why the file cannot be used. */
export function cookiesLineFor(contents: string): { line: string } | { problem: string } {
	if (!looksLikeCookies(contents)) {
		return { problem: "that file is not a cookies.txt export — it should start with # Netscape HTTP Cookie File" };
	}

	return { line: cookiesAsLine(contents) };
}

function main(): void {
	const file = process.argv.slice(2).find((argument) => !argument.startsWith("-"));

	if (file === undefined || !existsSync(resolve(process.cwd(), file))) {
		console.error(
			stepLine("failed", "Cookies", "name the exported file: npm run music:cookies -- cookies.txt", undefined, paint),
		);
		process.exitCode = 1;
		return;
	}

	const result = cookiesLineFor(readFileSync(resolve(process.cwd(), file), "utf8"));
	if ("problem" in result) {
		console.error(stepLine("failed", "Cookies", result.problem, undefined, paint));
		process.exitCode = 1;
		return;
	}

	console.log(`\n  ${paint.bold(KEY)}\n\n${result.line}\n`);
	console.log(`  Paste the line above as the value of ${KEY}. It is a signed-in login: never share it.\n`);
}

if (require.main === module) main();
