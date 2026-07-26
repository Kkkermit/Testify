import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import prompts from "prompts";

/** Asks for the settings the bot needs and writes them to `.env`. */

interface Field {
	key: string;
	message: string;
	required: boolean;
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

async function main(): Promise<void> {
	const target = resolve(process.cwd(), ".env");

	if (existsSync(target)) {
		const { overwrite } = await prompts({
			type: "confirm",
			name: "overwrite",
			message: ".env already exists. Replace it?",
			initial: false,
		});
		if (overwrite !== true) {
			console.log("Left your .env alone.");
			return;
		}
	}

	const answers = await prompts(
		FIELDS.map((field) => ({
			type: "text" as const,
			name: field.key,
			message: `${field.message}${field.required ? "" : " (optional)"}`,
		})),
		{ onCancel: () => process.exit(1) },
	);

	const missing = FIELDS.filter((field) => field.required && !String(answers[field.key] ?? "").trim());
	if (missing.length > 0) {
		console.error(`Missing required values: ${missing.map((field) => field.key).join(", ")}`);
		process.exitCode = 1;
		return;
	}

	const lines = FIELDS.map((field) => `${field.key}=${String(answers[field.key] ?? "").trim()}`);
	writeFileSync(target, `${lines.join("\n")}\n`, "utf8");

	console.log("Wrote .env. Start the bot with `npm run dev`.");
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
