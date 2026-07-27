import { strings } from "@config/strings";

/**
 * Every string is user-visible copy, so the risk is a template that silently
 * renders `undefined` or `[object Object]` into chat. Calling each builder with
 * a realistic argument is what catches that.
 */
type Leaf = string | ((...args: never[]) => string);

function walk(value: unknown, path: string[] = []): [string, Leaf][] {
	if (typeof value === "string" || typeof value === "function") return [[path.join("."), value as Leaf]];
	if (value === null || typeof value !== "object") return [];

	return Object.entries(value).flatMap(([key, child]) => walk(child, [...path, key]));
}

const leaves = walk(strings);

const ARGUMENTS: Record<string, unknown[]> = {
	"generic.unknownCommand": ["t?"],
	"generic.blacklisted": ["spamming"],
	"generic.cooldown": ["3 seconds"],
	"generic.externalApi": ["TMDB"],
	"permissions.userMissing": [["BanMembers", "KickMembers"]],
	"permissions.botMissing": [["ManageRoles"]],
	"economy.targetNoAccount": ["alice"],
	"economy.insufficientWallet": [1234],
	"economy.insufficientBank": [50],
};

describe("strings", () => {
	it("has copy to check", () => {
		expect(leaves.length).toBeGreaterThan(20);
	});

	it.each(leaves)("%s renders without a hole in it", (name, leaf) => {
		const rendered =
			typeof leaf === "function" ? (leaf as (...args: unknown[]) => string)(...(ARGUMENTS[name] ?? [1])) : leaf;

		expect(typeof rendered).toBe("string");
		expect(rendered.length).toBeGreaterThan(0);
		expect(rendered).not.toContain("undefined");
		expect(rendered).not.toContain("[object Object]");
		expect(rendered).not.toContain("NaN");
	});

	it("interpolates the values it is given", () => {
		expect(strings.generic.unknownCommand("t?")).toContain("t?help");
		expect(strings.generic.blacklisted("spamming")).toContain("spamming");
		expect(strings.generic.externalApi("TMDB")).toContain("TMDB");
	});

	it("formats a missing-permission list as inline code", () => {
		const rendered = strings.permissions.userMissing(["BanMembers", "KickMembers"]);

		expect(rendered).toContain("`BanMembers`");
		expect(rendered).toContain("`KickMembers`");
	});

	it("groups thousands in economy amounts, so 1234 does not read as 1234", () => {
		expect(strings.economy.insufficientWallet(1234)).toContain("1,234");
	});
});
