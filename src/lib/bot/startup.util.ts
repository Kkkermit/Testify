import { type Client, DiscordAPIError, Events } from "discord.js";
import { EnvError, type EnvFile } from "@config/env";
import { SetupError } from "@core/errors";
import { badge, box, colourEnabled, type Paint, painter, stepLine, type StepState, type Tone } from "@core/terminal";

/** What a person watching the terminal sees while the bot starts, and what they see when it cannot. */

export interface BootFacts {
	name: string;
	version: string;
	mode: string;
	node: string;
	platform: string;
}

type Write = (line: string) => void;

const toStdout: Write = (line) => process.stdout.write(`${line}\n`);

/** Prints one line per start-up step as it finishes, so a slow or failing step is visible where it happens. */
export class BootReport {
	readonly #write: Write;
	readonly #paint: Paint;

	constructor(write: Write = toStdout, paint: Paint = painter()) {
		this.#write = write;
		this.#paint = paint;
	}

	header(facts: BootFacts): void {
		const paint = this.#paint;
		this.#write("");
		this.#write(
			`  ${paint.pink(paint.bold("◆"))} ${paint.bold(facts.name)} ${paint.dim(`v${facts.version}`)}  ${paint.dim("starting in")} ${modeLabel(facts.mode, paint)} ${paint.dim("mode")}`,
		);
		this.#write(`    ${paint.dim(`Node ${facts.node} · ${facts.platform}`)}`);
		this.#write("");
	}

	note(state: StepState, label: string, detail: string, ms?: number): void {
		this.#write(stepLine(state, label, detail, ms, this.#paint));
	}

	/** Runs one step and reports it; a failure is marked on its own line and then thrown on for the caller to explain. */
	async step<T>(label: string, work: () => Promise<T> | T, describe: (result: T) => string): Promise<T> {
		const started = performance.now();

		try {
			const result = await work();
			this.note("done", label, describe(result), performance.now() - started);
			return result;
		} catch (error) {
			this.note("failed", label, this.#paint.red("could not finish"), performance.now() - started);
			throw error;
		}
	}
}

function modeLabel(mode: string, paint: Paint): string {
	return mode === "production" ? paint.green(paint.bold(mode)) : paint.yellow(paint.bold(mode));
}

export interface StartupFailure {
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

/** Close codes after which Discord will never let this login in, and what to do about each. */
export const FATAL_CLOSE_CODES: Record<number, StartupFailure> = {
	4004: {
		title: "Discord rejected the bot token",
		tone: "error",
		lines: [
			"DISCORD_TOKEN is wrong, or was reset after you copied it.",
			"",
			`Get a fresh one: ${WHERE.DISCORD_TOKEN ?? ""}`,
		],
	},
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

function discordFailure(error: DiscordAPIError): StartupFailure | null {
	if (error.status === 401) return FATAL_CLOSE_CODES[4004] ?? null;

	if (error.code === 10002) {
		return {
			title: "That application does not exist",
			tone: "error",
			lines: [
				"DISCORD_CLIENT_ID does not match the application DISCORD_TOKEN belongs to.",
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
				"DISCORD_DEV_GUILD_ID names a server the bot is not in, or it was invited without",
				"the applications.commands scope.",
				"",
				"Invite it to that server again, or leave DISCORD_DEV_GUILD_ID blank to register everywhere.",
			],
		};
	}

	return null;
}

/** Turns anything start-up can throw into a titled explanation, keeping the stack only for real bugs. */
export function explainStartupFailure(error: unknown, paint: Paint = painter()): StartupFailure {
	if (error instanceof EnvError) return envFailure(error, paint);
	if (error instanceof SetupError)
		return { title: "The bot could not start", tone: "error", lines: error.message.split("\n") };

	if (error instanceof DiscordAPIError) {
		const known = discordFailure(error);
		if (known !== null) return known;
	}

	if (error instanceof Error && "code" in error && error.code === "TokenInvalid") {
		return FATAL_CLOSE_CODES[4004] ?? { title: "Discord rejected the bot token", tone: "error", lines: [] };
	}

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

/** Host and database only, never the credentials a connection string can carry. */
export function describeDatabase(uri: string): string {
	const match = /^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)(?:\/([^?]*))?/.exec(uri);
	if (match === null) return "connected";

	const [, hosts = "", database = ""] = match;
	const host = hosts.split(",")[0] ?? hosts;
	return database === "" ? host : `${host} · ${database}`;
}

/** Discord will never accept this login after these codes, and the client would otherwise wait for ever. */
export function exitOnFatalClose(client: Client, exit: (code: number) => void = (code) => process.exit(code)): void {
	client.on(Events.ShardDisconnect, (event) => {
		const failure = FATAL_CLOSE_CODES[event.code];
		if (failure === undefined || client.isReady()) return;

		const paint = painter(colourEnabled(process.stderr));
		process.stderr.write(`${startupFailureLines(failure, paint).join("\n")}\n`);
		exit(1);
	});
}

/** The oldest Node this is tested on; `package.json` says the same in `engines`, and a test keeps the two equal. */
export const MINIMUM_NODE = "24.11.0";

/** True when `version` (as `process.version` writes it) is older than `minimum`. */
export function nodeTooOld(version: string, minimum: string = MINIMUM_NODE): boolean {
	const parts = (text: string): number[] => text.replace(/^v/, "").split(".").map(Number);
	const [have, need] = [parts(version), parts(minimum)];

	for (let index = 0; index < need.length; index += 1) {
		const difference = (have[index] ?? 0) - (need[index] ?? 0);
		if (difference !== 0) return difference < 0;
	}
	return false;
}
