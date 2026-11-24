import { type Paint, painter, stepLine, type StepState } from "@core/terminal";

/** What a person watching the terminal sees while the bot starts: one line per step, as each finishes. */

interface BootFacts {
	name: string;
	version: string;
	mode: string;
	node: string;
	platform: string;
}

type Write = (line: string) => void;

const toStdout: Write = (line) => process.stdout.write(`${line}\n`);

/** Start-up was cut short by a reload or Ctrl+C; shutdown is already on its way out, so nothing is reported. */
export class StartupStopped extends Error {
	constructor() {
		super("Start-up stopped because the bot is shutting down.");
		this.name = "StartupStopped";
	}
}

/** Prints one line per start-up step as it finishes, so a slow or failing step is visible where it happens. */
export class BootReport {
	readonly #write: Write;
	readonly #paint: Paint;
	#stopped: () => boolean = () => false;

	constructor(write: Write = toStdout, paint: Paint = painter()) {
		this.#write = write;
		this.#paint = paint;
	}

	/** Once this answers true no line is printed, and the step running then ends start-up with `StartupStopped`. */
	stopWhen(stopped: () => boolean): this {
		this.#stopped = stopped;
		return this;
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
		if (this.#stopped()) return;
		this.#write(stepLine(state, label, detail, ms, this.#paint));
	}

	/** Runs one step and reports it; a failure is marked on its own line and then thrown on for the caller to explain. */
	async step<T>(label: string, work: () => Promise<T> | T, describe: (result: T) => string): Promise<T> {
		const started = performance.now();
		let result: T;

		try {
			result = await work();
		} catch (error) {
			// A step that failed because shutting down closed what it was using is not a failure worth reporting.
			if (this.#stopped()) throw new StartupStopped();
			this.note("failed", label, this.#paint.red("could not finish"), performance.now() - started);
			throw error;
		}

		if (this.#stopped()) throw new StartupStopped();
		this.note("done", label, describe(result), performance.now() - started);
		return result;
	}
}

function modeLabel(mode: string, paint: Paint): string {
	return mode === "production" ? paint.green(paint.bold(mode)) : paint.yellow(paint.bold(mode));
}

/** Host and database only, never the credentials a connection string can carry. */
export function describeDatabase(uri: string): string {
	const match = /^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)(?:\/([^?]*))?/.exec(uri);
	if (match === null) return "connected";

	const [, hosts = "", database = ""] = match;
	const host = hosts.split(",")[0] ?? hosts;
	return database === "" ? host : `${host} · ${database}`;
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

const FEATURES_WIDTH = 52;

/** The Features line: the off features by name, as many as fit, and how many more. */
export function featuresLine(off: readonly string[]): string {
	const shown: string[] = [];
	for (const name of off) {
		const left = off.length - shown.length - 1;
		const tail = left > 0 ? ` and ${String(left)} more` : "";
		if ([...shown, name].join(", ").length + tail.length > FEATURES_WIDTH && shown.length > 0) break;
		shown.push(name);
	}

	const rest = off.length - shown.length;
	return `switched off: ${shown.join(", ")}${rest > 0 ? ` and ${String(rest)} more` : ""}`;
}
