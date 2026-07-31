import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

/** Everything the bot reads from the environment, in one list. */

const id = z.string().regex(/^\d{17,20}$/, "should be a Discord ID (17-20 digits)");

/** `true`/`false` as written in a .env file. `z.coerce.boolean()` reads "false" as true. */
const flag = z.enum(["true", "false"]).transform((value) => value === "true");

const schema = z
	.object({
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
	})
	.superRefine((env, ctx) => {
		if (!env.DASHBOARD_ENABLED) return;

		for (const key of ["DISCORD_CLIENT_SECRET", "DASHBOARD_BASE_URL", "DASHBOARD_SESSION_SECRET"] as const) {
			if (env[key] === undefined) {
				ctx.addIssue({ code: "custom", path: [key], message: "is required when DASHBOARD_ENABLED is true" });
			}
		}
	});

export type Env = z.infer<typeof schema>;

/**
 * `KEY=` in a .env file is an empty string, not an absent one, and the optional settings are meant to be left blank
 * — so a blank line has to mean "not set" rather than "set to nothing".
 */
function withoutBlanks(source: NodeJS.ProcessEnv): Record<string, string> {
	return Object.fromEntries(
		Object.entries(source).filter((entry): entry is [string, string] => (entry[1] ?? "").trim() !== ""),
	);
}

let cached: Env | undefined;

export function loadEnv(): Env {
	if (cached) return cached;

	if (process.env.JEST_WORKER_ID === undefined) {
		const file = resolve(process.cwd(), process.env.NODE_ENV === "development" ? ".env.development" : ".env");
		if (existsSync(file)) loadDotenv({ path: file, quiet: true });
	}

	const result = schema.safeParse(withoutBlanks(process.env));

	if (!result.success) {
		const problems = result.error.issues.map((issue) => `  ${issue.path.join(".")} ${issue.message}`).join("\n");
		throw new Error(`Your .env file needs attention:\n\n${problems}\n\nRun \`npm run setup\` to build one.`);
	}

	cached = Object.freeze(result.data);
	return cached;
}

/** Used by the tests so each one can load a different environment. */
export function resetEnv(): void {
	cached = undefined;
}
