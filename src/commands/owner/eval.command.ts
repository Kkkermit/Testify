import { inspect } from "node:util";
import { runInNewContext } from "node:vm";
import { theme } from "@config/theme";
import { OWNER_ONLY_REFUSAL } from "@core/checks";
import { defineCommand } from "@core/command";
import { toError, UserFacingError } from "@core/errors";
import { reportEval, reportOwnerAttempt } from "@lib/bot";
import { embed, reply } from "@lib/discord";
import { truncate } from "@lib/format";

const SECRET_PATTERN = /(token|secret|password|mongodb(_|-)?uri|api(_|-)?key)/i;

function redact(output: string, secrets: string[]): string {
	let cleaned = output;
	for (const secret of secrets) {
		if (secret.length >= 8) cleaned = cleaned.replaceAll(secret, "[redacted]");
	}
	return cleaned;
}

const evalCommand = defineCommand({
	name: "eval",
	description: "Evaluates JavaScript. Owner only.",
	category: "owner",
	private: true,
	ownerOnly: true,
	options: [
		{ name: "code", description: "The code to evaluate.", type: "string", required: true },
		{ name: "depth", description: "Inspection depth.", type: "integer", min: 0, max: 5 },
	],

	async run(interaction, client) {
		// `runChecks` already refuses everybody else; this holds even if something reaches `run` without it.
		if (!client.isOwner(interaction.user.id)) {
			await reportOwnerAttempt(client, interaction, evalCommand);
			throw new UserFacingError(OWNER_ONLY_REFUSAL);
		}

		const code = interaction.options.getString("code", true);
		const depth = interaction.options.getInteger("depth") ?? 1;

		await interaction.deferReply();

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
		const shown = redact(output, secrets);

		await reportEval(client, interaction, { code, output: shown, failed, elapsedMs });

		await reply(interaction, {
			embeds: [
				embed({
					colour: failed ? theme.colours.error : theme.colours.success,
					title: failed ? "Evaluation failed" : "Evaluation result",
					fields: [
						{ name: "Input", value: `\`\`\`js\n${truncate(code, 900)}\n\`\`\`` },
						{ name: "Output", value: `\`\`\`js\n${truncate(shown, 900)}\n\`\`\`` },
						{ name: "Took", value: `${elapsedMs.toFixed(2)}ms`, inline: true },
					],
				}),
			],
		});
	},
});

export default evalCommand;
