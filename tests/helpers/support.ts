import { type Env } from "@config/env";
import { loadEverything } from "@core/loader";
import { type SupportEntry } from "@lib/support/support.types";
import { commandEntries, loadArticles } from "@lib/support/supportArticles.util";
import { createMockClient } from "@tests/helpers/mocks";

/** Every entry the real bot would answer with: the written articles and a page per command, loaded from disk. */
export function realEntries(): SupportEntry[] {
	const client = createMockClient();
	loadEverything(client);

	return [
		...loadArticles().flatMap((result) => (result.ok ? [result.entry] : [])),
		...commandEntries(client.commands.values()),
	];
}

/** Credential-shaped values assembled at runtime, so no literal in the repository reads as a secret to a scanner. */
export const FAKE = {
	discordToken: ["MTAwMDAwMDAwMDAwMDAwMDAx", "GabcDE", "abcdefghijklmnopqrstuvwxyz0123456789"].join("."),
	otherDiscordToken: ["MTIzNDU2Nzg5MDEyMzQ1Njc4OTA", "Gx1y2z", "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7"].join("."),
	anthropicKey: ["sk", "ant", "api03", "abcdefghijklmnopqrstuvwxyz"].join("-"),
	otherAnthropicKey: ["sk", "ant", "api03", "somethinglongenough"].join("-"),
	githubToken: ["ghp", "abcdefghijklmnopqrstuvwxyz0123"].join("_"),
	privateKey: ["-----BEGIN RSA", "PRIVATE KEY-----"].join(" "),
	databasePassword: ["hunter2", "hunter2"].join(""),
	mongoUri: ["mongodb+srv://testify", `${["hunter2", "hunter2"].join("")}@cluster0.example.mongodb.net/testify`].join(
		":",
	),
};

export const FAKE_ENV = {
	DISCORD_TOKEN: FAKE.discordToken,
	DISCORD_CLIENT_SECRET: "client-secret-value-123",
	DASHBOARD_SESSION_SECRET: "s".repeat(40),
	MONGODB_URI: FAKE.mongoUri,
	SUPPORT_AI_API_KEY: FAKE.anthropicKey,
} as Env;
