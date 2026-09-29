import { type Env, ENV_KEYS } from "@config/env";
import { cookieFileText, looksLikeCookies } from "@lib/music/musicBinaries.util";

/** The last check before anything reaches a reader: names what in a text looks secret or personal, never the value. */

const MIN_SECRET_LENGTH = 8;

export function secretsOf(env: Env): string[] {
	const values = [
		env.DISCORD_TOKEN,
		env.DISCORD_CLIENT_SECRET,
		env.DASHBOARD_SESSION_SECRET,
		env.MONGODB_URI,
		env.SUPPORT_AI_API_KEY,
		...credentialsIn(env.MONGODB_URI),
		...cookieValues(env.MUSIC_YTDLP_COOKIES),
	];

	return values.filter((value): value is string => value !== undefined && value.length >= MIN_SECRET_LENGTH);
}

/** Each cookie's value in a cookies file the variable holds, and the variable itself when it is one base64 line. */
function cookieValues(held: string | undefined): string[] {
	const text = held === undefined ? null : cookieFileText(held);
	if (held === undefined || text === null) return [];

	const values = text
		.split("\n")
		.map((line) => line.split("\t"))
		// A row has seven columns; browsers write HttpOnly cookies, the session ones, as `#HttpOnly_.youtube.com`.
		.filter((columns) => columns.length === 7)
		.map((columns) => columns.at(-1)?.trim() ?? "");

	return looksLikeCookies(held) ? values : [...values, held.trim()];
}

function credentialsIn(uri: string): string[] {
	try {
		const { username, password } = new URL(uri);
		return [decodeURIComponent(username), decodeURIComponent(password)];
	} catch {
		return [];
	}
}

const ENV_NAME = new RegExp(`\\b(?:${ENV_KEYS.join("|")})\\b`);

const RULES: { name: string; pattern: RegExp }[] = [
	{ name: "discord-token", pattern: /[\w-]{23,28}\.[\w-]{6,7}\.[\w-]{27,}/ },
	{ name: "credentials-in-url", pattern: /\b[a-z][a-z\d+.-]*:\/\/[^\s/@:]+:[^\s/@]+@/i },
	{ name: "api-key", pattern: /\b(?:sk-(?:ant-)?[\w-]{16,}|gh[opsu]_\w{20,}|github_pat_\w{20,}|AKIA[\dA-Z]{16})/ },
	{ name: "private-key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
	{ name: "email", pattern: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/ },
	{ name: "discord-id", pattern: /\b\d{17,20}\b/ },
	{ name: "ip-address", pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/ },
	{ name: "env-name", pattern: ENV_NAME },
	{ name: "env-file", pattern: /(?:^|[\s(`'"])\.env\b/ },
	{ name: "file-path", pattern: /(?:\/home\/|\/root\/|\/Users\/|\/etc\/|[A-Za-z]:\\)/ },
];

export function findLeak(text: string, secrets: readonly string[]): string | null {
	if (secrets.some((secret) => text.includes(secret))) return "secret";

	return RULES.find((rule) => rule.pattern.test(text))?.name ?? null;
}
