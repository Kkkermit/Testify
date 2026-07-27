import { inspect } from "node:util";
import { runInNewContext } from "node:vm";
import { MessageFlags } from "discord.js";
import { defineCommand } from "@core/command";
import { toError } from "@core/errors";
import { embed } from "@lib/embeds";
import { truncate } from "@lib/format";
import { reply } from "@lib/reply";

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
	category: "owner",
	ownerOnly: true,
	options: [
		{ name: "code", description: "The code to evaluate.", type: "string", required: true },
		{ name: "depth", description: "Inspection depth.", type: "integer", min: 0, max: 5 },
	],

	async run(interaction, client) {
		const code = interaction.options.getString("code", true);
		const depth = interaction.options.getInteger("depth") ?? 1;

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const startedAt = process.hrtime.bigint();
		let output: string;
		let failed = false;

		try {
			const result: unknown = await runInNewContext(
				`(async () => { ${code.includes("return") ? code : `return ${code}`} })()`,
				{ client, interaction, console: undefined },
				{ timeout: 5_000 },
			);
			output = typeof result === "string" ? result : inspect(result, { depth });
		} catch (error) {
			failed = true;
			output = toError(error).message;
		}

		const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

		const secrets = Object.entries(client.env)
			.filter(([key]) => SECRET_PATTERN.test(key))
			.map(([, value]) => String(value));

		await reply(interaction, {
			embeds: [
				embed({
					colour: failed ? "Red" : "Green",
					title: failed ? "Evaluation failed" : "Evaluation result",
					fields: [
						{ name: "Input", value: `\`\`\`js\n${truncate(code, 900)}\n\`\`\`` },
						{ name: "Output", value: `\`\`\`js\n${truncate(redact(output, secrets), 900)}\n\`\`\`` },
						{ name: "Took", value: `${elapsedMs.toFixed(2)}ms`, inline: true },
					],
				}),
			],
			flags: MessageFlags.Ephemeral,
		});
	},
});
