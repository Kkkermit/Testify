import { parse } from "mathjs";
import { CALCULATOR_FUNCTIONS, unsupportedPart } from "@commands/community/calculator.command";

const refuses = (expression: string): string | null => unsupportedPart(parse(expression));

describe("what the calculator will evaluate", () => {
	it.each([
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
	])("allows %s", (expression) => {
		expect(refuses(expression)).toBeNull();
	});
});

/**
 * `mathjs` allocates whatever a matrix builder is asked for, so `zeros(100000, 100000)` exhausts the heap —
 * and a V8 out-of-memory abort is not something `reportSurvivable` can catch, so any user in any server could
 * end the process with one command. Each of these was verified to kill a real Node process before the fix.
 */
describe("expressions that could take the bot down", () => {
	it.each(["zeros(100000, 100000)", "ones(50000, 50000)", "range(0, 1e9)", "concat([1], [2])", "matrix([1, 2, 3])"])(
		"refuses %s",
		(expression) => {
			expect(refuses(expression)).not.toBeNull();
		},
	);
});

/** The documented `mathjs` escape routes. None of these should reach the evaluator. */
describe("expressions that could run code", () => {
	it.each([
		["import('x')", "import"],
		["createUnit('x')", "createUnit"],
		["evaluate('1+1')", "evaluate"],
		["parse('1+1')", "parse"],
		["simplify('x+x')", "simplify"],
		["derivative('x^2', 'x')", "derivative"],
		["config({})", "config"],
	])("refuses %s", (expression, name) => {
		expect(refuses(expression)).toBe(name);
	});

	/** Assignment is how a name or a function gets defined, which is more than arithmetic. */
	it.each(["a = 5", "f(x) = x^2"])("refuses %s", (expression) => {
		expect(refuses(expression)).toBe("assignment");
	});
});

describe("the allowlist itself", () => {
	/** An allowlist that let a matrix builder in would be no allowlist at all. */
	it.each(["zeros", "ones", "range", "concat", "matrix", "import", "evaluate", "parse", "createUnit"])(
		"does not contain %s",
		(name) => {
			expect(CALCULATOR_FUNCTIONS.has(name)).toBe(false);
		},
	);

	it("names the first unsupported call rather than the whole expression", () => {
		expect(refuses("sqrt(16) + zeros(2, 2)")).toBe("zeros");
	});
});
