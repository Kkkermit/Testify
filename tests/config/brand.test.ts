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
	/** The name is whatever the token's own bot is called on Discord, so a renamed application needs no setting. */
	it("is the Discord username, and the built-in name only until Discord has said", () => {
		expect(resolveBotName("Helper")).toBe("Helper");
		expect(resolveBotName("  ")).toBe(DEFAULT_BOT_NAME);
		expect(resolveBotName(null)).toBe(DEFAULT_BOT_NAME);
		expect(resolveBotName()).toBe(DEFAULT_BOT_NAME);
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
