import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { DEFAULT_BOT_NAME, resolveBotName } from "@testify/shared";

const ROOT = resolve(__dirname, "../..");
const SWEPT = ["src", "shared/src", "dashboard/src", "assets/support", "dashboard/index.html"];
const TEXT = /\.(ts|tsx|json|md|html)$/;
const TEST = /\.test\.tsx?$|[/\\]test[/\\]/;

/** Code names and the upstream repository's address are not the bot's display name. */
const NOT_THE_NAME = /TestifyClient|Kkkermit\/Testify/g;

function filesUnder(path: string): string[] {
	if (!statSync(path).isDirectory()) return TEXT.test(path) && !TEST.test(path) ? [path] : [];

	return readdirSync(path).flatMap((entry) => filesUnder(join(path, entry)));
}

describe("the bot's name", () => {
	/** `BOT_NAME` is somebody's explicit choice, so it beats the username their Discord application happens to have. */
	it("is BOT_NAME first, then the Discord username, then the built-in name", () => {
		expect(resolveBotName("Helper", "Helper#app")).toBe("Helper");
		expect(resolveBotName(undefined, "Helper#app")).toBe("Helper#app");
		expect(resolveBotName("  ", null)).toBe(DEFAULT_BOT_NAME);
		expect(resolveBotName(undefined, undefined)).toBe(DEFAULT_BOT_NAME);
	});

	/** Forks had to find and replace the name across 200 strings, and missed the ones that mattered. */
	it("is written nowhere but its default, so a fork renames the bot in .env", () => {
		const offenders = SWEPT.flatMap((part) => filesUnder(join(ROOT, part)))
			.filter((file) => !file.endsWith(join("shared", "src", "brand.ts")))
			.flatMap((file) =>
				readFileSync(file, "utf8")
					.split("\n")
					.flatMap((line, index) =>
						/\bTestify\b/.test(line.replace(NOT_THE_NAME, "")) ? [`${relative(ROOT, file)}:${index + 1}`] : [],
					),
			);

		expect(offenders).toEqual([]);
	});
});
