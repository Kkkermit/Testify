import { parse } from "mathjs";
import { CALCULATOR_FUNCTIONS, unsupportedPart } from "@commands/community/calculator.command";

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

it("names the first unsupported call rather than the whole expression", () => {
	expect(refuses("sqrt(16) + zeros(2, 2)")).toBe("zeros");
});
