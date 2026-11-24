import { type Client, DiscordAPIError, Events, HTTPError } from "discord.js";
import { EnvError, type EnvFile } from "@config/env";
import { InstanceError } from "@config/instance";
import { SetupError } from "@core/errors";
import { badge, box, colourEnabled, type Paint, painter, type Tone } from "@core/terminal";

/** What a person sees when the bot cannot start: a titled box saying what to change, never a stack for set-up. */

interface StartupFailure {
	title: string;
	tone: Tone;
	lines: string[];
	/** Only for failures nothing here recognises, which are bugs rather than set-up. */
	stack?: string;
}

/** Where each required value lives, for somebody setting the bot up for the first time. */
const WHERE: Record<string, string> = {
	DISCORD_TOKEN: "Developer Portal → your app → Bot → Reset Token",
	DISCORD_CLIENT_ID: "Developer Portal → your app → General Information",
	DISCORD_OWNER_IDS: "Developer Mode on, then right-click yourself → Copy User ID",
	MONGODB_URI: "mongodb://localhost:27017/testify, or an Atlas string",
	DISCORD_CLIENT_SECRET: "Developer Portal → your app → OAuth2 → Client Secret",
	DASHBOARD_BASE_URL: "where the dashboard opens, e.g. http://localhost:5174",
	DASHBOARD_SESSION_SECRET: "npm run secret -- --write puts one in for you",
};

const TOKEN_REJECTED: StartupFailure = {
	title: "Discord rejected the bot token",
	tone: "error",
	lines: [
		"DISCORD_TOKEN is wrong, or was reset after you copied it.",
		"",
		`Get a fresh one: ${WHERE.DISCORD_TOKEN ?? ""}`,
	],
};

/** Close codes after which Discord will never let this login in, and what to do about each. */
export const FATAL_CLOSE_CODES: Record<number, StartupFailure> = {
	4004: TOKEN_REJECTED,
	4014: {
		title: "Two privileged intents are switched off",
		tone: "error",
		lines: [
			"The bot reads members and messages, and Discord has to be told it may.",
			"",
			"Developer Portal → your app → Bot → Privileged Gateway Intents:",
			"  • Server Members Intent",
			"  • Message Content Intent",
			"",
			"Save, then start the bot again. Nothing else needs changing.",
		],
	},
};

function envFailure(error: EnvError, paint: Paint): StartupFailure {
	const file = error.file;
	const width = Math.max(...error.problems.map((problem) => problem.key.length));
	const lines: string[] = [];

	if (!file.exists) {
		lines.push(`There is no ${paint.bold(file.name)} file yet, so nothing is configured.`, "");
	} else {
		lines.push(`${paint.bold(file.name)} needs ${error.problems.length === 1 ? "one change" : "a few changes"}:`, "");
	}

	for (const problem of error.problems) {
		lines.push(`  ${paint.yellow("•")} ${paint.bold(problem.key.padEnd(width))}  ${problem.message}`);
		const where = WHERE[problem.key];
		if (problem.missing && where !== undefined) lines.push(`    ${paint.dim(`↳ ${where}`)}`);
	}

	lines.push("", ...fixEnv(file, paint));
	return { title: "The bot is not configured yet", tone: "warning", lines };
}

function fixEnv(file: EnvFile, paint: Paint): string[] {
	const dev = file.name === ".env.development";
	const setup = dev ? "npm run setup -- --dev" : "npm run setup";
	const template = dev ? ".env.development.example" : ".env.example";

	return [
		`${paint.cyan("➜")} Run ${paint.bold(setup)} to be asked for each value,`,
		`  or copy ${paint.bold(template)} to ${paint.bold(file.name)} and fill it in.`,
	];
}

function instanceFailure(error: InstanceError, paint: Paint): StartupFailure {
	const width = Math.max(...error.problems.map((problem) => problem.key.length));
	const count = error.problems.length === 1 ? "one change" : "a few changes";

	return {
		title: "The config file needs attention",
		tone: "warning",
		lines: [
			`${paint.bold(error.file.name)} needs ${count}:`,
			"",
			...error.problems.map(
				(problem) => `  ${paint.yellow("•")} ${paint.bold(problem.key.padEnd(width))}  ${problem.message}`,
			),
			"",
			`${paint.cyan("➜")} Fix it, or delete it to use the built-in settings.`,
			`  ${paint.bold("docs/customising.md")} explains every setting.`,
		],
	};
}

function discordFailure(error: DiscordAPIError): StartupFailure | null {
	if (error.status === 401) return TOKEN_REJECTED;

	if (error.code === 10002) {
		return {
			title: "That application does not exist",
			tone: "error",
			lines: [
				"DISCORD_CLIENT_ID does not match the application",
				"that DISCORD_TOKEN belongs to.",
				"",
				`Copy the ID from ${WHERE.DISCORD_CLIENT_ID ?? ""}.`,
			],
		};
	}

	if (error.code === 50001) {
		return {
			title: "The bot cannot add commands to your test server",
			tone: "error",
			lines: [
				"DISCORD_DEV_GUILD_ID names a server the bot is not in, or the bot",
				"was invited there without the applications.commands scope.",
				"",
				"Invite it to that server again, or leave DISCORD_DEV_GUILD_ID",
				"blank to register the commands everywhere.",
			],
		};
	}

	return null;
}

const CONNECTION_CODES = new Set([
	"ENOTFOUND",
	"EAI_AGAIN",
	"ECONNREFUSED",
	"ECONNRESET",
	"ETIMEDOUT",
	"ENETUNREACH",
	"EHOSTUNREACH",
	"UND_ERR_CONNECT_TIMEOUT",
	"UND_ERR_HEADERS_TIMEOUT",
	"UND_ERR_SOCKET",
]);

/** The system code of a failed connection, read from the error or the one it wraps, since fetch nests it. */
function connectionCode(error: unknown): string | null {
	for (let current = error, depth = 0; current instanceof Error && depth < 3; depth++) {
		const code = (current as { code?: unknown }).code;
		if (typeof code === "string" && CONNECTION_CODES.has(code)) return code;
		if (current.name === "AbortError") return "timed out";
		current = current.cause;
	}

	return null;
}

const NETWORK_ADVICE = [
	"",
	"Check this machine's internet connection, and any firewall, proxy",
	"or VPN that could be blocking discord.com.",
	"",
	"Nothing in your settings needs changing.",
];

// The database step wraps its own failures in a SetupError, so a network failure that gets this far is Discord's.
function unreachableFailure(error: unknown): StartupFailure | null {
	if (error instanceof HTTPError) {
		return {
			title: "Discord is having problems",
			tone: "error",
			lines: [
				`Discord answered with ${error.status}, a fault on its side rather than yours.`,
				"",
				"Check discordstatus.com, and start the bot again once it has recovered.",
			],
		};
	}

	// Discord's own refusals carry a numeric code; anything else is a reply from something in between.
	if (error instanceof DiscordAPIError && typeof error.code !== "number") {
		return {
			title: "Discord could not be reached",
			tone: "error",
			lines: [`Something other than Discord answered the request, with ${error.status}.`, ...NETWORK_ADVICE],
		};
	}

	const code = connectionCode(error);
	if (code === null) return null;

	return {
		title: "Discord could not be reached",
		tone: "error",
		lines: [`The connection to Discord failed (${code}).`, ...NETWORK_ADVICE],
	};
}

/** Turns anything start-up can throw into a titled explanation, keeping the stack only for real bugs. */
export function explainStartupFailure(error: unknown, paint: Paint = painter()): StartupFailure {
	if (error instanceof EnvError) return envFailure(error, paint);
	if (error instanceof InstanceError) return instanceFailure(error, paint);
	if (error instanceof SetupError) {
		return { title: "The bot could not start", tone: "error", lines: error.message.split("\n") };
	}

	if (error instanceof DiscordAPIError) {
		const known = discordFailure(error);
		if (known !== null) return known;
	}

	const unreachable = unreachableFailure(error);
	if (unreachable !== null) return unreachable;

	if (error instanceof Error && "code" in error && error.code === "TokenInvalid") return TOKEN_REJECTED;

	const problem = error instanceof Error ? error : new Error(String(error));
	return {
		title: "Something went wrong while starting",
		tone: "error",
		lines: [problem.message, "", "This looks like a bug rather than a set-up problem. The stack is below."],
		...(problem.stack === undefined ? {} : { stack: problem.stack }),
	};
}

export function startupFailureLines(failure: StartupFailure, paint: Paint = painter()): string[] {
	const label = failure.tone === "warning" ? "SETUP" : "ERROR";

	return [
		"",
		`  ${badge(label, failure.tone, paint)} ${paint.bold(failure.title)}`,
		"",
		...box("", failure.lines, failure.tone, paint).map((line) => `  ${line}`),
		...(failure.stack === undefined ? [] : ["", paint.dim(failure.stack)]),
		"",
	];
}

/** Written straight to stderr, because the logger may not exist yet and a stack is rarely what is needed. */
export function printStartupFailure(error: unknown): void {
	const paint = painter(colourEnabled(process.stderr));
	process.stderr.write(`${startupFailureLines(explainStartupFailure(error, paint), paint).join("\n")}\n`);
}

/** Without this the client would wait for ever after a close code Discord will never accept. */
export function exitOnFatalClose(client: Client, exit: (code: number) => void = (code) => process.exit(code)): void {
	client.on(Events.ShardDisconnect, (event) => {
		const failure = FATAL_CLOSE_CODES[event.code];
		if (failure === undefined || client.isReady()) return;

		const paint = painter(colourEnabled(process.stderr));
		process.stderr.write(`${startupFailureLines(failure, paint).join("\n")}\n`);
		exit(1);
	});
}
