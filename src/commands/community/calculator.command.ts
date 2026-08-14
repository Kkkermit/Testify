import { evaluate, format, type MathNode, parse } from "mathjs";
import { defineCommand } from "@core/command";
import { UserFacingError } from "@core/errors";
import { embed } from "@lib/embeds.util";
import { truncate } from "@lib/format.util";
import { reply } from "@lib/reply.util";

/**
 * The functions a calculator needs, and only those.
 *
 * An allowlist rather than a list of banned names: `mathjs` ships matrix builders that allocate whatever they
 * are asked for, so `zeros(100000, 100000)` exhausts the heap — and a V8 out-of-memory abort is not something
 * `reportSurvivable` can catch, so it takes the whole bot down rather than failing one command.
 */
export const CALCULATOR_FUNCTIONS = new Set([
	"abs",
	"acos",
	"acosh",
	"asin",
	"asinh",
	"atan",
	"atan2",
	"atanh",
	"cbrt",
	"ceil",
	"combinations",
	"cos",
	"cosh",
	"cube",
	"exp",
	"factorial",
	"fix",
	"floor",
	"gcd",
	"hypot",
	"lcm",
	"log",
	"log10",
	"log2",
	"max",
	"mean",
	"median",
	"min",
	"mod",
	"nthRoot",
	"permutations",
	"round",
	"sign",
	"sin",
	"sinh",
	"sqrt",
	"square",
	"tan",
	"tanh",
]);

/** The first thing in the expression a calculator will not evaluate, or null when there is nothing. */
export function unsupportedPart(node: MathNode): string | null {
	let found: string | null = null;

	node.traverse((child) => {
		if (found !== null) return;

		// Assignment is how `mathjs` defines names and functions, which is more than arithmetic.
		if (child.type === "AssignmentNode" || child.type === "FunctionAssignmentNode") {
			found = "assignment";
			return;
		}

		if (child.type === "FunctionNode") {
			const name = (child as unknown as { fn: { name?: string } }).fn.name ?? "";
			if (!CALCULATOR_FUNCTIONS.has(name)) found = name === "" ? "that function" : name;
		}
	});

	return found;
}

export default defineCommand({
	name: "calculate",
	description: "Evaluates a mathematical expression.",
	category: "community",
	options: [{ name: "expression", description: "The expression to evaluate.", type: "string", required: true }],

	async run(interaction) {
		const expression = interaction.options.getString("expression", true).trim();

		if (expression.length > 200) throw new UserFacingError("That expression is too long.");

		// Parsing builds a tree without running anything, so the check happens before any of it is evaluated.
		let tree: MathNode;
		try {
			tree = parse(expression);
		} catch {
			throw new UserFacingError("I could not work that out. Check the syntax and try again.");
		}

		const unsupported = unsupportedPart(tree);
		if (unsupported !== null) {
			throw new UserFacingError(`I will not evaluate \`${truncate(unsupported, 40)}\` — this is a calculator.`);
		}

		let result: unknown;
		try {
			result = evaluate(expression);
		} catch {
			throw new UserFacingError("I could not work that out. Check the syntax and try again.");
		}

		if (typeof result === "function" || result === undefined) {
			throw new UserFacingError("That expression did not produce a value.");
		}

		// mathjs returns matrices, units and complex numbers as objects, so its own
		// formatter is used rather than string coercion.
		const rendered = format(result, { precision: 14 });

		await reply(interaction, {
			embeds: [
				embed({
					category: "community",
					title: "Calculator",
					fields: [
						{ name: "Expression", value: `\`\`\`\n${truncate(expression, 500)}\n\`\`\`` },
						{ name: "Result", value: `\`\`\`\n${truncate(rendered, 500)}\n\`\`\`` },
					],
				}),
			],
		});
	},
});
