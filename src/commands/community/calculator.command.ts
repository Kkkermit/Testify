import { evaluate, format } from "mathjs";
import { defineCommand } from "@core/command";
import { UserFacingError } from "@core/errors";
import { embed } from "@lib/embeds.util";
import { truncate } from "@lib/format.util";
import { reply } from "@lib/reply.util";

/**
 * `mathjs` can evaluate assignments and function definitions, which is more than a calculator needs, so the input is
 * restricted to arithmetic before evaluation.
 */
const ALLOWED = /^[\d\s+\-*/^%().,!eEpiPI a-z]+$/;
const BLOCKED = /\b(import|createUnit|evaluate|parse|simplify|derivative|config)\b|=/;

export default defineCommand({
	name: "calculate",
	description: "Evaluates a mathematical expression.",
	category: "community",
	options: [{ name: "expression", description: "The expression to evaluate.", type: "string", required: true }],

	async run(interaction) {
		const expression = interaction.options.getString("expression", true).trim();

		if (expression.length > 200) throw new UserFacingError("That expression is too long.");
		if (!ALLOWED.test(expression) || BLOCKED.test(expression)) {
			throw new UserFacingError("That expression contains characters or functions I will not evaluate.");
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
