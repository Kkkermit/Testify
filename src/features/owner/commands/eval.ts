import { inspect } from "node:util";
import { runInNewContext } from "node:vm";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { toError } from "../../../core/errors";
import { embed } from "../../../ui/embeds";
import { truncate } from "../../../ui/format";

const SECRET_PATTERN = /(token|secret|password|mongodb(_|-)?uri|api(_|-)?key)/i;

function redact(output: string, secrets: string[]): string {
	let cleaned = output;
	for (const secret of secrets) {
		if (secret.length >= 8) cleaned = cleaned.replaceAll(secret, "[redacted]");
	}
	return cleaned;
}

/**
 * Owner-only, gated by `ownerOnly` rather than the previous `.includes()` check
 * against a single developer-ID string — which did substring matching, so a user
 * ID that happened to be a substring passed.
 */
export default defineCommand({
	name: "eval",
	description: "Evaluates JavaScript. Owner only.",
	category: Category.Owner,
	surfaces: ["slash"],
	ownerOnly: true,
	options: [
		{ name: "code", description: "The code to evaluate.", type: "string", required: true, greedy: true },
		{ name: "depth", description: "Inspection depth.", type: "integer", minValue: 0, maxValue: 5 },
	],

	async execute(ctx) {
		const code = ctx.options.getString("code", true);
		const depth = ctx.options.getInteger("depth") ?? 1;

		await ctx.defer(true);

		const startedAt = process.hrtime.bigint();
		let output: string;
		let failed = false;

		try {
			const result: unknown = await runInNewContext(
				`(async () => { ${code.includes("return") ? code : `return ${code}`} })()`,
				{ client: ctx.client, ctx, console: undefined },
				{ timeout: 5_000 },
			);
			output = typeof result === "string" ? result : inspect(result, { depth });
		} catch (error) {
			failed = true;
			output = toError(error).message;
		}

		const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

		const secrets = Object.entries(ctx.client.env)
			.filter(([key]) => SECRET_PATTERN.test(key))
			.map(([, value]) => String(value));

		await ctx.reply({
			embeds: [
				embed({
					color: failed ? "Red" : "Green",
					title: failed ? "Evaluation failed" : "Evaluation result",
					fields: [
						{ name: "Input", value: `\`\`\`js\n${truncate(code, 900)}\n\`\`\`` },
						{ name: "Output", value: `\`\`\`js\n${truncate(redact(output, secrets), 900)}\n\`\`\`` },
						{ name: "Took", value: `${elapsedMs.toFixed(2)}ms`, inline: true },
					],
				}),
			],
			ephemeral: true,
		});
	},
});
