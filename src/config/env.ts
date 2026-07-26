import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

/**
 * The single environment loader. It runs once, validates against a schema, and
 * throws at boot rather than letting a missing variable surface halfway through
 * a command.
 */

const snowflake = z.string().regex(/^\d{17,20}$/, "must be a Discord snowflake (17-20 digits)");

const snowflakeList = z
	.string()
	.transform((value) =>
		value
			.split(",")
			.map((part) => part.trim())
			.filter(Boolean),
	)
	.pipe(z.array(snowflake));

const optionalUrl = z.url().optional();

const envSchema = z.object({
	NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
	LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),

	DISCORD_TOKEN: z.string().min(1, "a bot token is required"),
	DISCORD_CLIENT_ID: snowflake,
	DISCORD_DEV_GUILD_ID: snowflake.optional(),
	DISCORD_OWNER_IDS: snowflakeList,

	MONGODB_URI: z.string().min(1, "a MongoDB connection string is required"),

	CHANNEL_GUILD_JOIN_LOG: snowflake.optional(),
	CHANNEL_GUILD_LEAVE_LOG: snowflake.optional(),
	CHANNEL_COMMAND_ERROR_LOG: snowflake.optional(),
	CHANNEL_EVAL_LOG: snowflake.optional(),
	CHANNEL_DM_LOG: snowflake.optional(),

	WEBHOOK_SLASH_LOGGING: optionalUrl,
	WEBHOOK_PREFIX_LOGGING: optionalUrl,
	WEBHOOK_BUG_REPORTS: optionalUrl,
	WEBHOOK_SUGGESTIONS: optionalUrl,
	WEBHOOK_CONSOLE_LOGGING: optionalUrl,

	TMDB_API_KEY: z.string().min(1).optional(),
	RAPID_API_KEY: z.string().min(1).optional(),
	CLASH_ROYALE_API_KEY: z.string().min(1).optional(),

	SPOTIFY_CLIENT_ID: z.string().min(1).optional(),
	SPOTIFY_CLIENT_SECRET: z.string().min(1).optional(),
	SPOTIFY_REDIRECT_URI: optionalUrl,

	OAUTH_PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
	OAUTH_STATE_SECRET: z.string().min(32, "must be at least 32 characters").optional(),
	NGROK_AUTH_TOKEN: z.string().min(1).optional(),

	/** 32-byte key, hex encoded. Required before any third-party OAuth token is stored. */
	TOKEN_ENCRYPTION_KEY: z
		.string()
		.regex(/^[0-9a-fA-F]{64}$/, "must be 64 hex characters (32 bytes)")
		.optional(),
});

export type Env = z.infer<typeof envSchema>;

function envFileFor(nodeEnv: string | undefined): string {
	return nodeEnv === "development" ? ".env.development" : ".env";
}

let cached: Env | undefined;

/** Loads, validates and freezes the environment. Subsequent calls return the cached value. */
export function loadEnv(): Env {
	if (cached) return cached;

	const file = resolve(process.cwd(), envFileFor(process.env.NODE_ENV));
	if (existsSync(file)) {
		loadDotenv({ path: file, quiet: true });
	}

	const parsed = envSchema.safeParse(process.env);
	if (!parsed.success) {
		const details = parsed.error.issues
			.map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
			.join("\n");
		throw new Error(`Invalid environment configuration:\n${details}`);
	}

	cached = Object.freeze(parsed.data);
	return cached;
}

/** Test seam — resets the memoised value so a suite can load a different environment. */
export function resetEnvCache(): void {
	cached = undefined;
}

export const ENV_KEYS = Object.keys(envSchema.shape) as (keyof Env)[];

export const REQUIRED_ENV_KEYS: (keyof Env)[] = [
	"DISCORD_TOKEN",
	"DISCORD_CLIENT_ID",
	"DISCORD_OWNER_IDS",
	"MONGODB_URI",
];
