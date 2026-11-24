import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import prompts from "prompts";
import {
	type AnalyticsChoice,
	analyticsLines,
	collectorFields,
	dashboardFields,
	type Field,
	fields,
	instanceFields,
	instanceFileText,
	newAuditKey,
	OPERATOR_CONTACT,
	writeSecretFile,
} from "./setupQuestions";
import { box, painter } from "@core/terminal";

/** Asks for the settings the bot needs and writes `.env`, or `.env.development` with `--dev`. */

const paint = painter();

/** One line, because a prompt redrawn over several lines leaves copies of itself behind in some terminals. */
function question(field: Field): string {
	const optional = field.required ? "" : paint.dim(" (optional)");
	const hint = field.hint === undefined ? "" : paint.dim(` · ${field.hint}`);
	return `${paint.bold(field.message)}${optional}${hint}`;
}

async function ask(list: Field[]): Promise<Record<string, string>> {
	const answers = await prompts(
		list.map((field) => ({
			type: "text" as const,
			name: field.key,
			message: question(field),
			...(field.initial === undefined || field.initial === "" ? {} : { initial: field.initial }),
			validate: (raw: string) => {
				const value = raw.trim();
				if (value === "") return field.required ? "This one is required." : true;
				return field.check?.(value) ?? true;
			},
		})),
		{ onCancel: () => process.exit(1) },
	);

	return Object.fromEntries(list.map((field) => [field.key, String(answers[field.key] ?? "").trim()]));
}

function print(lines: string[]): void {
	process.stdout.write(`${lines.join("\n")}\n`);
}

async function main(): Promise<void> {
	const isDev = process.argv.includes("--dev");
	const filename = isDev ? ".env.development" : ".env";
	const target = resolve(process.cwd(), filename);

	print([
		"",
		...box(
			`Setting up ${filename}`,
			[
				isDev
					? "For a development bot: use a second Discord application, not the one people invite."
					: "For the bot people invite. A development bot belongs in `npm run setup -- --dev`.",
				"",
				`Everything asked here can be changed later by editing ${filename}.`,
				`Press ${paint.bold("Ctrl+C")} at any point to stop without writing anything.`,
			],
			"info",
			paint,
		).map((line) => `  ${line}`),
		"",
	]);

	if (existsSync(target)) {
		const { overwrite } = await prompts({
			type: "confirm",
			name: "overwrite",
			message: `${filename} already exists. Replace it?`,
			initial: false,
		});
		if (overwrite !== true) {
			print([`  ${paint.dim(`Left your ${filename} alone.`)}`]);
			return;
		}
	}

	const questions = fields(isDev);
	const answers = await ask(questions);

	const { wantsDashboard } = await prompts(
		{
			type: "confirm",
			name: "wantsDashboard",
			message: `${paint.bold("Set up the web dashboard as well?")}${paint.dim(" (needs an OAuth2 client secret)")}`,
			initial: false,
		},
		{ onCancel: () => process.exit(1) },
	);

	const extra = wantsDashboard === true ? dashboardFields(isDev) : [];
	const dashboard = extra.length > 0 ? await ask(extra) : {};

	const { analytics, identify } = (await prompts(
		[
			{
				type: "select",
				name: "analytics",
				message: `${paint.bold("Analytics for the owner console?")}${paint.dim(" (Shardlens — which commands run, how they end)")}`,
				choices: [
					{ title: "Off", value: "off" },
					{ title: "Inside the bot", description: "Nothing else to run or set", value: "embedded" },
					{
						title: "A collector I run",
						description: "Its address and keys, from npx shardlens init",
						value: "collector",
					},
				],
				initial: 0,
			},
			{
				type: (previous: AnalyticsChoice) => (previous === "embedded" ? "confirm" : null),
				name: "identify",
				message: `${paint.bold("Show who ran each command?")}${paint.dim(" (only the bot's owners see it)")}`,
				initial: true,
			},
		],
		{ onCancel: () => process.exit(1) },
	)) as { analytics: AnalyticsChoice; identify?: boolean };
	const collector = analytics === "collector" ? await ask(collectorFields()) : {};
	const auditKey = identify === true ? newAuditKey() : null;

	const lines = questions.map((field) => `${field.key}=${answers[field.key] ?? ""}`);

	if (wantsDashboard === true) {
		lines.push(
			"",
			"DASHBOARD_ENABLED=true",
			...extra.map((field) => `${field.key}=${dashboard[field.key] ?? ""}`),
			`DASHBOARD_SESSION_SECRET=${randomBytes(32).toString("base64url")}`,
		);
	}

	lines.push(...analyticsLines(analytics, collector, auditKey));

	writeSecretFile(target, `${lines.join("\n")}\n`);

	const next = isDev
		? [`${paint.cyan("➜")} ${paint.bold(wantsDashboard === true ? "npm run dev:all" : "npm run dev")}`]
		: [`${paint.cyan("➜")} ${paint.bold("npm run build")}`, `${paint.cyan("➜")} ${paint.bold("npm start")}`];

	const steps = [`Wrote ${paint.bold(filename)}. Start the bot with:`, "", ...next.map((line) => `  ${line}`)];

	if (wantsDashboard === true) {
		const callback = `${dashboard.DASHBOARD_BASE_URL ?? ""}/api/auth/callback`;
		steps.push("", "One more step in the Developer Portal, under OAuth2 → Redirects:", `  ${paint.bold(callback)}`);
	}

	if (analytics === "embedded") {
		steps.push(
			"",
			`Analytics run inside the bot. Keep the ${paint.bold("shardlens-data")} folder: its keys are there.`,
		);
		if (auditKey !== null)
			steps.push(`Keep a copy of ${paint.bold("SHARDLENS_AUDIT_KEY")}: the names are unreadable without it.`);
	}

	const configured = await makeItYours();
	if (configured !== null) steps.push("", `Your links and settings are in ${paint.bold(configured)}.`);

	print(["", ...box("Done", steps, "success", paint).map((line) => `  ${line}`), ""]);
}

/** Optional, and separate from `.env`, because none of it is secret and a fork may want to commit it. */
async function makeItYours(): Promise<string | null> {
	const filename = "testify.config.json";
	const target = resolve(process.cwd(), filename);

	const { wanted } = await prompts(
		{
			type: "confirm",
			name: "wanted",
			message: `${paint.bold("Make it your own?")}${paint.dim(` (who runs it, your links, the prefix — written to ${filename})`)}`,
			initial: false,
		},
		{ onCancel: () => process.exit(1) },
	);
	if (wanted !== true) return null;

	if (existsSync(target)) {
		const { overwrite } = await prompts({
			type: "confirm",
			name: "overwrite",
			message: `${filename} already exists. Replace it?`,
			initial: false,
		});
		if (overwrite !== true) return null;
	}

	const answers = await ask(instanceFields());
	const contact = (answers["operator.name"] ?? "") === "" ? {} : await ask([OPERATOR_CONTACT]);
	const text = instanceFileText({ ...answers, ...contact });
	if (text === null) return null;

	writeFileSync(target, text, "utf8");
	return filename;
}

main().catch((error: unknown) => {
	process.stderr.write(`${String(error)}\n`);
	process.exitCode = 1;
});
