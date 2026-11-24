import { strings } from "@config/strings";

/** No template renders `undefined` or `[object Object]` into chat. */
type Leaf = string | ((...args: never[]) => string);

function walk(value: unknown, path: string[] = []): [string, Leaf][] {
	if (typeof value === "string" || typeof value === "function") return [[path.join("."), value as Leaf]];
	if (value === null || typeof value !== "object") return [];

	return Object.entries(value).flatMap(([key, child]) => walk(child, [...path, key]));
}

const leaves = walk(strings);

const ARGUMENTS: Record<string, unknown[]> = {
	"economy.targetNoAccount": ["alice"],
	"economy.insufficientWallet": [1234],
	"economy.insufficientBank": [50],
	"testPost.note": ["the welcome message", "Test Server"],
};

describe("strings", () => {
	it("renders every line without a hole in it", () => {
		const holed = leaves.filter(([name, leaf]) => {
			const rendered =
				typeof leaf === "function" ? (leaf as (...args: unknown[]) => string)(...(ARGUMENTS[name] ?? [1])) : leaf;

			return typeof rendered !== "string" || rendered.length === 0 || /undefined|\[object Object\]|NaN/.test(rendered);
		});

		expect(leaves.length).toBeGreaterThan(20);
		expect(holed.map(([name]) => name)).toEqual([]);
	});

	it("groups thousands in economy amounts, so 1234 does not read as 1234", () => {
		expect(strings.economy.insufficientWallet(1234)).toContain("1,234");
	});
});
