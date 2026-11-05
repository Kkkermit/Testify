import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import blacklistCommand from "@commands/owner/blacklist.command";
import { ERASURE } from "@database/repositories/accountRepository";

/** Only the bot's owners put somebody on the blacklist or take them off it, and deleting your own data is not a way off. */

const SRC = join(__dirname, "../../src");
const WRITERS = ["commands/owner/blacklist.command.ts", "api/routes/blacklist.ts"];
const SOURCES = ["@database", "@database/models/moderation.schema", "@database/repositories/blacklistRepository"];

function modules(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) return modules(path);
		return path.endsWith(".ts") ? [relative(SRC, path).split(sep).join("/")] : [];
	});
}

/** Every name a module imports from the database layer, however the import is wrapped. */
function databaseImports(file: string): string[] {
	const text = readFileSync(join(SRC, file), "utf8");
	return [...text.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*"([^"]+)"/g)]
		.filter((match) => SOURCES.includes(match[2] ?? ""))
		.flatMap((match) => (match[1] ?? "").split(",").map((name) => name.replace(/^\s*type\s+/, "").trim()));
}

describe("the blacklist", () => {
	const files = modules(SRC);

	it("has modules to check, so a broken walk cannot pass vacuously", () => {
		expect(files.length).toBeGreaterThan(300);
		expect(files).toEqual(expect.arrayContaining(WRITERS));
	});

	it("is read and written through its repository alone", () => {
		const reaching = files.filter(
			(file) => file !== "database/repositories/blacklistRepository.ts" && databaseImports(file).includes("Blacklist"),
		);
		const raw = files.filter((file) =>
			/model(?:<[^>]*>)?\(\s*["']blacklist|collection\(\s*["']blacklists?["']/.test(
				readFileSync(join(SRC, file), "utf8"),
			),
		);

		expect([...reaching, ...raw]).toEqual(["database/models/moderation.schema.ts"]);
	});

	it("is changed only by the owner command and the owner console", () => {
		const changing = files.filter((file) =>
			databaseImports(file).some((name) => name === "addToBlacklist" || name === "removeFromBlacklist"),
		);

		expect(changing.sort()).toEqual([...WRITERS].sort());
	});

	it("refuses /blacklist to anybody who is not an owner, before anything else is asked", () => {
		expect(blacklistCommand.ownerOnly).toBe(true);
		expect(readFileSync(join(SRC, "api/routes/blacklist.ts"), "utf8")).toMatch(/blacklist\.use\("\*", requireOwner\)/);
	});

	it("keeps an entry when the person on it deletes their data", () => {
		expect(ERASURE.blacklist).toEqual({ userId: "keep" });
	});
});
