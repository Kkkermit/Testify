import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import prompts from "prompts";
import { type z } from "zod";
import { instanceFileSchema } from "@config/instance";
import { box, painter } from "@core/terminal";
import { BOT_FEATURE_KEYS, isBotFeature } from "@testify/shared";

/** Asks for the settings the bot needs and writes `.env`, or `.env.development` with `--dev`. */

const paint = painter();

export interface Field {
	key: string;
	message: string;
	hint?: string;
	required: boolean;
	initial?: string;
	check?: (value: string) => string | null;
}

const ID = /^\d{17,20}$/;

const discordId = (value: string): string | null =>
	ID.test(value) ? null : "A Discord ID is 17 to 20 digits. Turn on Developer Mode, then right-click → Copy ID.";

const featureList = (value: string): string | null => {
	const unknown = value
		.split(",")
		.map((part) => part.trim().toLowerCase())
		.filter((part) => part !== "" && !isBotFeature(part));
	return unknown.length === 0 ? null : `Not a feature: ${unknown.join(", ")}.`;
};

const discordIds = (value: string): string | null =>
	value
		.split(",")
		.map((part) => part.trim())
		.every((part) => ID.test(part))
		? null
		: "Discord IDs are 17 to 20 digits, separated by commas.";

export function fields(isDev: boolean): Field[] {
	return [
		{
			key: "DISCORD_TOKEN",
			message: "Bot token",
			hint: "Developer Portal → your app → Bot → Reset Token",
			required: true,
			check: (value) => (/\s/.test(value) ? "A token has no spaces in it." : null),
		},
		{
			key: "DISCORD_CLIENT_ID",
			message: "Application ID",
			hint: "Developer Portal → your app → General Information",
			required: true,
			check: discordId,
		},
		{
			key: "DISCORD_OWNER_IDS",
			message: "Your Discord user ID",
			hint: "Comma separated for more than one owner",
			required: true,
			check: discordIds,
		},
		{
			key: "MONGODB_URI",
			message: "MongoDB connection string",
			hint: "A local database is mongodb://localhost:27017/testify",
			required: true,
			initial: isDev ? "mongodb://localhost:27017/testify-dev" : "",
			check: (value) => (/^mongodb(\+srv)?:\/\//.test(value) ? null : "It starts with mongodb:// or mongodb+srv://"),
		},
		{
			key: "DISCORD_DEV_GUILD_ID",
			message: "Test server ID",
			hint: isDev ? "Commands appear there only, which is what you want while building" : "Leave blank in production",
			required: false,
			check: discordId,
		},
		{
			key: "LOG_LEVEL",
			message: "Log level",
			hint: "trace, debug, info, warn, error or fatal",
			required: false,
			initial: isDev ? "debug" : "",
			check: (value) =>
				["trace", "debug", "info", "warn", "error", "fatal"].includes(value) ? null : "Pick one of the six levels.",
		},
		{
			key: "DISABLED_FEATURES",
			message: "Features to switch off",
			hint: `Comma-separated, or blank for all of them: ${BOT_FEATURE_KEYS.join(", ")}`,
			required: false,
			check: featureList,
		},
		{ key: "CHANNEL_ERROR_LOG", message: "Channel ID for command errors", required: false, check: discordId },
		{ key: "CHANNEL_GUILD_LOG", message: "Channel ID for servers joined and left", required: false, check: discordId },
		{ key: "CHANNEL_DM_LOG", message: "Channel ID for DMs sent to the bot", required: false, check: discordId },
		{
			key: "CHANNEL_SLASH_COMMAND_LOG",
			message: "Channel ID for every slash command run",
			required: false,
			check: discordId,
		},
		{
			key: "CHANNEL_PREFIX_COMMAND_LOG",
			message: "Channel ID for every prefix command run",
			required: false,
			check: discordId,
		},
		{ key: "CHANNEL_BUG_REPORT_LOG", message: "Channel ID for bug reports", required: false, check: discordId },
		{ key: "CHANNEL_SUGGESTION_LOG", message: "Channel ID for suggestions", required: false, check: discordId },
		{
			key: "CHANNEL_EVAL_LOG",
			message: "Channel ID for /eval runs and owner-command attempts",
			required: false,
			check: discordId,
		},
		{
			key: "SUPPORT_AI_API_KEY",
			message: "Anthropic API key for the support assistant",
			hint: "Blank answers questions by search alone and contacts nobody",
			required: false,
		},
		{
			key: "SITE_GITHUB_TOKEN",
			message: "GitHub token for the source page's traffic",
			hint: "Blank works, but a token lifts GitHub's limit of 60 an hour and shows traffic",
			required: false,
		},
	];
}

/** The same rule the bot reads the file with, so a wizard answer can never write a file the bot refuses. */
const byRule =
	(rule: z.ZodType) =>
	(value: string): string | null => {
		const result = rule.safeParse(value);
		return result.success ? null : `It ${result.error.issues[0]?.message ?? "is not valid"}.`;
	};

const keys = instanceFileSchema.shape;
const operator = keys.operator.unwrap().unwrap().shape;

export function instanceFields(): Field[] {
	return [
		{
			key: "operator.name",
			message: "Who runs this copy",
			hint: "Your name or your organisation's, shown on the privacy notice",
			required: false,
			check: byRule(operator.name),
		},
		{
			key: "supportServer",
			message: "Support server link",
			hint: "Where Support buttons lead. Type none to hide them, or leave blank for the default",
			required: false,
			check: (value) => (value === "none" ? null : byRule(keys.supportServer)(value)),
		},
		{
			key: "repository",
			message: "Your fork on GitHub",
			hint: "Blank keeps the original repository",
			required: false,
			check: byRule(keys.repository),
		},
		{
			key: "defaultPrefix",
			message: "Default prefix",
			hint: "What a server starts with; blank keeps t?",
			required: false,
			check: byRule(keys.defaultPrefix),
		},
	];
}

export const OPERATOR_CONTACT: Field = {
	key: "operator.contact",
	message: "How to reach them",
	hint: "An email address or an https:// page",
	required: true,
	check: byRule(operator.contact),
};

/** The file the wizard writes: only what was answered, so everything left blank keeps following the defaults. */
export function instanceFileText(answers: Record<string, string>): string | null {
	const given = (key: string): string | undefined => {
		const value = answers[key]?.trim() ?? "";
		return value === "" ? undefined : value;
	};
	const name = given("operator.name");
	const contact = given("operator.contact");
	const support = given("supportServer");

	const config: Record<string, unknown> = {
		...(given("repository") === undefined ? {} : { repository: given("repository") }),
		...(support === undefined ? {} : { supportServer: support === "none" ? null : support }),
		...(name === undefined || contact === undefined ? {} : { operator: { name, contact } }),
		...(given("defaultPrefix") === undefined ? {} : { defaultPrefix: given("defaultPrefix") }),
	};
	if (Object.keys(config).length === 0) return null;

	return `${JSON.stringify({ $schema: "./testify.config.schema.json", ...config }, null, "\t")}\n`;
}

export function dashboardFields(isDev: boolean): Field[] {
	return [
		{
			key: "DISCORD_CLIENT_SECRET",
			message: "OAuth2 client secret",
			hint: "Developer Portal → your app → OAuth2. This is not the bot token",
			required: true,
		},
		{
			key: "DASHBOARD_BASE_URL",
			message: "Where the dashboard will be opened",
			required: true,
			initial: isDev ? "http://localhost:5174" : "https://dashboard.example.com",
			check: (value) =>
				/^https?:\/\/[^/]+$/.test(value) ? null : "A URL like https://example.com, no trailing slash.",
		},
		{
			key: "DASHBOARD_PORT",
			message: "Port for the API",
			required: false,
			initial: "3000",
			check: (value) => (/^\d{1,5}$/.test(value) && Number(value) <= 65_535 ? null : "A port is 1 to 65535."),
		},
	];
}

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

	const lines = questions.map((field) => `${field.key}=${answers[field.key] ?? ""}`);

	if (wantsDashboard === true) {
		lines.push(
			"",
			"DASHBOARD_ENABLED=true",
			...extra.map((field) => `${field.key}=${dashboard[field.key] ?? ""}`),
			`DASHBOARD_SESSION_SECRET=${randomBytes(32).toString("base64url")}`,
		);
	}

	writeFileSync(target, `${lines.join("\n")}\n`, "utf8");

	const next = isDev
		? [`${paint.cyan("➜")} ${paint.bold(wantsDashboard === true ? "npm run dev:all" : "npm run dev")}`]
		: [`${paint.cyan("➜")} ${paint.bold("npm run build")}`, `${paint.cyan("➜")} ${paint.bold("npm start")}`];

	const steps = [`Wrote ${paint.bold(filename)}. Start the bot with:`, "", ...next.map((line) => `  ${line}`)];

	if (wantsDashboard === true) {
		const callback = `${dashboard.DASHBOARD_BASE_URL ?? ""}/api/auth/callback`;
		steps.push("", "One more step in the Developer Portal, under OAuth2 → Redirects:", `  ${paint.bold(callback)}`);
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

if (require.main === module) {
	main().catch((error: unknown) => {
		process.stderr.write(`${String(error)}\n`);
		process.exitCode = 1;
	});
}
