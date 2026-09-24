import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";
import { BOT_NAME_MAX } from "@testify/shared";

/** Everything the bot reads from the environment, in one list. */

const id = z.string().regex(/^\d{17,20}$/, "should be a Discord ID (17-20 digits)");

/** `true`/`false` as written in a .env file. `z.coerce.boolean()` reads "false" as true. */
const flag = z.enum(["true", "false"]).transform((value) => value === "true");

const fields = z.object({
	// Required.
	DISCORD_TOKEN: z.string().min(1, "is required — copy it from the Developer Portal"),
	DISCORD_CLIENT_ID: id,
	DISCORD_OWNER_IDS: z
		.string()
		.transform((value) =>
			value
				.split(",")
				.map((part) => part.trim())
				.filter(Boolean),
		)
		.pipe(z.array(id).min(1, "needs at least one Discord user ID")),
	MONGODB_URI: z.string().min(1, "is required — a MongoDB connection string"),

	// Optional.
	BOT_NAME: z
		.string()
		.trim()
		.min(1)
		.max(BOT_NAME_MAX, `is at most ${String(BOT_NAME_MAX)} characters, like a Discord username`)
		.optional(),
	NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
	LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
	DISCORD_DEV_GUILD_ID: id.optional(),
	CHANNEL_ERROR_LOG: id.optional(),
	CHANNEL_GUILD_LOG: id.optional(),
	CHANNEL_DM_LOG: id.optional(),
	CHANNEL_FEEDBACK_LOG: id.optional(),

	// Dashboard. Off by default, so a bot-only install needs none of these.
	DASHBOARD_ENABLED: flag.default(false),
	DISCORD_CLIENT_SECRET: z.string().min(1).optional(),
	DASHBOARD_BASE_URL: z.string().url().optional(),
	DASHBOARD_SESSION_SECRET: z.string().min(32, "needs at least 32 characters").optional(),
	DASHBOARD_PORT: z.coerce.number().int().min(1).max(65_535).default(3_000),
	DASHBOARD_BIND: z.string().min(1).default("127.0.0.1"),
	DASHBOARD_TRUST_PROXY: flag.default(false),
	DASHBOARD_SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),

	// Music. Both are paths to binaries the bot spawns; blank means "look on PATH".
	MUSIC_YTDLP_PATH: z.string().min(1).optional(),
	MUSIC_FFMPEG_PATH: z.string().min(1).optional(),

	// Support assistant. Without a key it answers by search alone and never contacts anybody.
	SUPPORT_AI_API_KEY: z.string().min(1).optional(),
	SUPPORT_AI_MODEL: z.string().min(1).default("claude-opus-5"),
});

/** Every variable name, so the support assistant can refuse to repeat one. */
export const ENV_KEYS: readonly string[] = Object.keys(fields.shape);

const schema = fields.superRefine((env, ctx) => {
	if (!env.DASHBOARD_ENABLED) return;

	for (const key of ["DISCORD_CLIENT_SECRET", "DASHBOARD_BASE_URL", "DASHBOARD_SESSION_SECRET"] as const) {
		if (env[key] === undefined) {
			ctx.addIssue({ code: "custom", path: [key], message: "is required when DASHBOARD_ENABLED is true" });
		}
	}
});

export type Env = z.infer<typeof schema>;

/** `KEY=` is an empty string, so a blank value has to mean not set. */
function withoutBlanks(source: NodeJS.ProcessEnv): Record<string, string> {
	return Object.fromEntries(
		Object.entries(source).filter((entry): entry is [string, string] => (entry[1] ?? "").trim() !== ""),
	);
}

export interface EnvFile {
	name: ".env" | ".env.development";
	path: string;
	exists: boolean;
}

/** `npm run dev` sets NODE_ENV=development, which is the only thing that picks `.env.development`. */
export function envFile(): EnvFile {
	const name = process.env.NODE_ENV === "development" ? ".env.development" : ".env";
	const path = resolve(process.cwd(), name);

	return { name, path, exists: existsSync(path) };
}

export interface EnvProblem {
	key: string;
	/** True when the variable was blank or absent, rather than set to something it cannot be. */
	missing: boolean;
	message: string;
}

/** Carries each problem apart, so start-up can say where to find every missing value. */
export class EnvError extends Error {
	readonly file: EnvFile;
	readonly problems: EnvProblem[];

	constructor(file: EnvFile, problems: EnvProblem[]) {
		const lines = problems.map((problem) => `  ${problem.key} ${problem.message}`).join("\n");
		super(`Your ${file.name} file needs attention:\n\n${lines}\n\nRun \`npm run setup\` to build one.`);
		this.name = "EnvError";
		this.file = file;
		this.problems = problems;
	}
}

let cached: Env | undefined;

export function loadEnv(): Env {
	if (cached) return cached;

	const file = envFile();
	if (process.env.JEST_WORKER_ID === undefined && file.exists) loadDotenv({ path: file.path, quiet: true });

	const source = withoutBlanks(process.env);
	const result = schema.safeParse(source);

	if (!result.success) {
		const problems = result.error.issues.map((issue): EnvProblem => {
			const key = issue.path.join(".");
			const missing = !(key in source);
			return { key, missing, message: missing && issue.code !== "custom" ? "is not set" : issue.message };
		});
		throw new EnvError(file, problems);
	}

	cached = Object.freeze(result.data);
	return cached;
}

/** Used by the tests so each one can load a different environment. */
export function resetEnv(): void {
	cached = undefined;
}
