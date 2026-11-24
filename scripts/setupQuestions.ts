import { randomBytes } from "node:crypto";
import { chmodSync, writeFileSync } from "node:fs";
import { type z } from "zod";
import { instanceFileSchema } from "@config/instance";
import { BOT_FEATURE_KEYS, isBotFeature } from "@testify/shared";

/** What `npm run setup` asks, how each answer is checked, and what each answer writes. */

/** The file holds the bot token, so only its owner may read it; Windows ignores the mode. */
export function writeSecretFile(path: string, text: string): void {
	writeFileSync(path, text, { encoding: "utf8", mode: 0o600 });
	// A write's mode applies only to a file it creates, and `.env` is often copied from the example first.
	chmodSync(path, 0o600);
}

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

export type AnalyticsChoice = "off" | "embedded" | "collector";

/** The four settings for a collector run elsewhere, asked only when that is the choice. */
export function collectorFields(): Field[] {
	return [
		{
			key: "SHARDLENS_URL",
			message: "Shardlens collector address, for analytics",
			hint: "Blank sends no analytics anywhere; it is in the bot.env the collector's init wrote",
			required: false,
		},
		{
			key: "SHARDLENS_INGEST_KEY",
			message: "Shardlens ingest key",
			hint: "From the same bot.env; it starts slk_ingest_",
			required: false,
		},
		{
			key: "SHARDLENS_READ_KEY",
			message: "Shardlens read key, for the owner console's analytics",
			hint: "From the collector's own settings; it starts slk_read_",
			required: false,
		},
		{
			key: "SHARDLENS_ACTIVITY_KEY",
			message: "Shardlens activity key, for who ran what in the owner console",
			hint: "Blank keeps who ran what on the collector; it starts slk_activity_",
			required: false,
		},
	];
}

/** The same shape `openssl rand -base64 32` gives, which is what the collector inside the bot asks for. */
export const newAuditKey = (): string => randomBytes(32).toString("base64");

/** What the analytics choice writes: nothing while off, one switch and maybe an audit key inside the bot. */
export function analyticsLines(
	choice: AnalyticsChoice,
	collector: Record<string, string>,
	auditKey: string | null,
): string[] {
	if (choice === "off") return [];
	if (choice === "collector")
		return ["", ...collectorFields().map((field) => `${field.key}=${collector[field.key] ?? ""}`)];
	return ["", "SHARDLENS_EMBEDDED=true", ...(auditKey === null ? [] : [`SHARDLENS_AUDIT_KEY=${auditKey}`])];
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
