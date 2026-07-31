import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import prompts from "prompts";

/**
 * Asks for the settings the bot needs and writes them to `.env`, or to
 * `.env.development` with `--dev`.
 */

interface Field {
	key: string;
	message: string;
	required: boolean;
	initial?: string;
}

const FIELDS: Field[] = [
	{ key: "DISCORD_TOKEN", message: "Bot token (Developer Portal → Bot → Token)", required: true },
	{ key: "DISCORD_CLIENT_ID", message: "Application ID", required: true },
	{ key: "DISCORD_OWNER_IDS", message: "Your Discord user ID (comma separated for more)", required: true },
	{ key: "MONGODB_URI", message: "MongoDB connection string", required: true },
	{ key: "DISCORD_DEV_GUILD_ID", message: "Test server ID (commands appear instantly there)", required: false },
	{ key: "LOG_LEVEL", message: "Log level: trace, debug, info, warn, error or fatal", required: false },
	{ key: "CHANNEL_ERROR_LOG", message: "Channel ID for command errors", required: false },
	{ key: "CHANNEL_GUILD_LOG", message: "Channel ID for server join and leave notices", required: false },
	{ key: "CHANNEL_DM_LOG", message: "Channel ID for direct messages sent to the bot", required: false },
	{ key: "CHANNEL_FEEDBACK_LOG", message: "Channel ID for bug reports and suggestions", required: false },
];

/**
 * Asked only if the dashboard is wanted, so a bot-only install answers four questions rather than twelve.
 * `DASHBOARD_SESSION_SECRET` is not among them — nobody should be inventing 32 characters of randomness by hand.
 */
function dashboardFields(isDev: boolean): Field[] {
	return [
		{
			key: "DISCORD_CLIENT_SECRET",
			message: "OAuth2 client secret (Developer Portal → OAuth2). NOT the bot token",
			required: true,
		},
		{
			key: "DASHBOARD_BASE_URL",
			message: "Where the dashboard will be reachable",
			required: true,
			initial: isDev ? "http://localhost:5174" : "https://dashboard.example.com",
		},
		{ key: "DASHBOARD_PORT", message: "Port for the API", required: false, initial: "3000" },
	];
}

async function ask(fields: Field[]): Promise<Record<string, string>> {
	const answers = await prompts(
		fields.map((field) => ({
			type: "text" as const,
			name: field.key,
			message: `${field.message}${field.required ? "" : " (optional)"}`,
			...(field.initial === undefined ? {} : { initial: field.initial }),
		})),
		{ onCancel: () => process.exit(1) },
	);

	return Object.fromEntries(fields.map((field) => [field.key, String(answers[field.key] ?? "").trim()]));
}

function missingFrom(fields: Field[], answers: Record<string, string>): string[] {
	return fields.filter((field) => field.required && !answers[field.key]).map((field) => field.key);
}

async function main(): Promise<void> {
	// `npm run setup -- --dev` writes the file `npm run dev` reads, so a
	// development bot can be set up without touching the production one.
	const isDev = process.argv.includes("--dev");
	const filename = isDev ? ".env.development" : ".env";
	const target = resolve(process.cwd(), filename);

	if (existsSync(target)) {
		const { overwrite } = await prompts({
			type: "confirm",
			name: "overwrite",
			message: `${filename} already exists. Replace it?`,
			initial: false,
		});
		if (overwrite !== true) {
			console.log(`Left your ${filename} alone.`);
			return;
		}
	}

	const answers = await ask(FIELDS);

	const { wantsDashboard } = await prompts(
		{
			type: "confirm",
			name: "wantsDashboard",
			message: "Set up the web dashboard as well? (needs an OAuth2 client secret)",
			initial: false,
		},
		{ onCancel: () => process.exit(1) },
	);

	const extra = wantsDashboard === true ? dashboardFields(isDev) : [];
	const dashboard = extra.length > 0 ? await ask(extra) : {};

	const missing = [...missingFrom(FIELDS, answers), ...missingFrom(extra, dashboard)];
	if (missing.length > 0) {
		console.error(`Missing required values: ${missing.join(", ")}`);
		process.exitCode = 1;
		return;
	}

	const lines = FIELDS.map((field) => `${field.key}=${answers[field.key] ?? ""}`);

	if (wantsDashboard === true) {
		lines.push(
			"",
			"DASHBOARD_ENABLED=true",
			...extra.map((field) => `${field.key}=${dashboard[field.key] ?? ""}`),
			`DASHBOARD_SESSION_SECRET=${randomBytes(32).toString("base64url")}`,
		);
	}

	writeFileSync(target, `${lines.join("\n")}\n`, "utf8");

	console.log(`Wrote ${filename}. Start the bot with \`npm run ${isDev ? "dev" : "start"}\`.`);

	if (wantsDashboard === true) {
		const callback = `${dashboard.DASHBOARD_BASE_URL ?? ""}/api/auth/callback`;
		console.log(`\nOne more step: add ${callback} under OAuth2 → Redirects in the Developer Portal.`);
		if (isDev) console.log("Then run `npm run dev:all` to start the bot and the dashboard together.");
	}
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
