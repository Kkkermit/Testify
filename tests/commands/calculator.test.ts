import { parse } from "mathjs";
import calculate, { CALCULATOR_FUNCTIONS, unsupportedPart } from "@commands/community/calculator.command";
import { UserFacingError } from "@core/errors";
import { createMockClient, createMockInteraction } from "@tests/helpers/mocks";

const refuses = (expression: string): string | null => unsupportedPart(parse(expression));

it("allows ordinary arithmetic", () => {
	const allowed = [
		"2 + 2 * 3",
		"sqrt(16)",
		"sin(pi / 2)",
		"log(100, 10)",
		"5!",
		"2^10",
		"round(3.14159, 2)",
		"max(1, 2, 3)",
		"nthRoot(27, 3)",
		"hypot(3, 4)",
	];

	expect(allowed.filter((expression) => refuses(expression) !== null)).toEqual([]);
});

/** Expressions that would exhaust the heap, which an out-of-memory abort would turn into the whole bot going down. */
it("refuses expressions that could take the bot down", () => {
	const heavy = [
		"zeros(100000, 100000)",
		"ones(50000, 50000)",
		"range(0, 1e9)",
		"concat([1], [2])",
		"matrix([1, 2, 3])",
	];

	expect(heavy.filter((expression) => refuses(expression) === null)).toEqual([]);
});

/** The documented `mathjs` escape routes, and assignment, which defines a name or a function: none reach the evaluator. */
it("refuses expressions that could run code, naming the part it refused", () => {
	const escapes: [expression: string, refused: string][] = [
		["import('x')", "import"],
		["createUnit('x')", "createUnit"],
		["evaluate('1+1')", "evaluate"],
		["parse('1+1')", "parse"],
		["simplify('x+x')", "simplify"],
		["derivative('x^2', 'x')", "derivative"],
		["config({})", "config"],
		["a = 5", "assignment"],
		["f(x) = x^2", "assignment"],
	];

	expect(escapes.map(([expression]) => refuses(expression))).toEqual(escapes.map(([, refused]) => refused));
});

/** An allowlist that let a matrix builder in would be no allowlist at all. */
it("keeps every builder and escape route off the allowlist", () => {
	const never = ["zeros", "ones", "range", "concat", "matrix", "import", "evaluate", "parse", "createUnit"];

	expect(never.filter((name) => CALCULATOR_FUNCTIONS.has(name))).toEqual([]);
});

/** `1:1e9` builds a billion-number matrix with no function in sight, and the heap running out aborts the process. */
it("refuses a range, which is a matrix builder written as an operator", () => {
	expect(["1:1e9", "max(1:1e9)", "[1, 2, 3][1:2]"].map(refuses)).toEqual(["a range", "a range", "a range"]);
});

/**
 * mathjs counts combinations and permutations out one step at a time on the thread every shard shares, so
 * `combinations(1e15, 5e14)` froze the whole bot for good; a number given as text is converted the same way.
 */
it("works out combinations and permutations only for numbers it can count out at once", async () => {
	const sent = async (expression: string): Promise<string> => {
		const interaction = createMockInteraction({ options: { expression } });
		await calculate.run?.(interaction, createMockClient());
		return JSON.stringify(interaction.sent[0]);
	};
	const refused = async (expression: string): Promise<boolean> =>
		sent(expression).then(
			() => false,
			(error: unknown) => error instanceof UserFacingError,
		);

	expect(await sent("combinations(10, 3)")).toContain("```\\n120\\n```");
	expect(await sent("permutations(5, 2)")).toContain("```\\n20\\n```");
	expect(
		await Promise.all(
			["combinations(200000, 100000)", "permutations(200000, 150000)", 'combinations("200000", "100000")'].map(refused),
		),
	).toEqual([true, true, true]);
});

it("names the first unsupported call rather than the whole expression", () => {
	expect(refuses("sqrt(16) + zeros(2, 2)")).toBe("zeros");
});

/** mathjs is loaded when the command first runs rather than at start-up, so the run itself has to reach it. */
it("works an expression out and shows the result", async () => {
	const interaction = createMockInteraction({ options: { expression: "2 + 2 * 3" } });

	await calculate.run?.(interaction, createMockClient());

	expect(JSON.stringify(interaction.sent[0])).toContain("```\\n8\\n```");
});
