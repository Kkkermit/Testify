import pino, { type Logger as PinoLogger } from "pino";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export interface Logger {
	trace(obj: object, msg?: string): void;
	trace(msg: string): void;
	debug(obj: object, msg?: string): void;
	debug(msg: string): void;
	info(obj: object, msg?: string): void;
	info(msg: string): void;
	warn(obj: object, msg?: string): void;
	warn(msg: string): void;
	error(obj: object, msg?: string): void;
	error(msg: string): void;
	fatal(obj: object, msg?: string): void;
	fatal(msg: string): void;
	child(bindings: Record<string, unknown>): Logger;
}

export interface LoggerOptions {
	level: LogLevel;
	pretty: boolean;
	/** Mirrors warn-and-above to a Discord webhook. Failures here never affect the caller. */
	webhookUrl?: string;
}

function createTransport(options: LoggerOptions): PinoLogger {
	if (!options.pretty) {
		return pino({ level: options.level });
	}

	return pino({
		level: options.level,
		transport: {
			target: "pino-pretty",
			options: {
				colorize: true,
				translateTime: "yyyy-mm-dd HH:MM:ss",
				ignore: "pid,hostname",
				messageFormat: "{if scope}[{scope}] {end}{msg}",
			},
		},
	});
}

/**
 * Best-effort Discord webhook mirror with a serialised queue and exponential
 * backoff, so a burst of errors cannot spam the gateway or lose ordering.
 */
class WebhookSink {
	private readonly queue: string[] = [];
	private draining = false;
	private backoffMs = 1_000;

	constructor(private readonly url: string) {}

	push(line: string): void {
		if (this.queue.length >= 100) return;
		this.queue.push(line);
		if (!this.draining) void this.drain();
	}

	private async drain(): Promise<void> {
		this.draining = true;
		while (this.queue.length > 0) {
			const batch = this.queue.splice(0, 10).join("\n").slice(0, 1_900);
			try {
				const response = await fetch(this.url, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ content: `\`\`\`\n${batch}\n\`\`\`` }),
				});
				if (response.status === 429) {
					await new Promise((done) => setTimeout(done, this.backoffMs));
					this.backoffMs = Math.min(this.backoffMs * 2, 60_000);
					continue;
				}
				this.backoffMs = 1_000;
			} catch {
				// A logging transport must never take the process down.
				this.backoffMs = Math.min(this.backoffMs * 2, 60_000);
				await new Promise((done) => setTimeout(done, this.backoffMs));
			}
		}
		this.draining = false;
	}
}

function wrap(base: PinoLogger, sink: WebhookSink | undefined): Logger {
	const emit = (level: LogLevel, first: object | string, second?: string): void => {
		if (typeof first === "string") {
			base[level](first);
		} else {
			base[level](first, second);
		}

		if (sink && (level === "warn" || level === "error" || level === "fatal")) {
			const message = typeof first === "string" ? first : (second ?? "");
			const context = typeof first === "string" ? "" : ` ${safeStringify(first)}`;
			sink.push(`[${level.toUpperCase()}] ${message}${context}`);
		}
	};

	return {
		trace: (first: object | string, second?: string) => emit("trace", first, second),
		debug: (first: object | string, second?: string) => emit("debug", first, second),
		info: (first: object | string, second?: string) => emit("info", first, second),
		warn: (first: object | string, second?: string) => emit("warn", first, second),
		error: (first: object | string, second?: string) => emit("error", first, second),
		fatal: (first: object | string, second?: string) => emit("fatal", first, second),
		child: (bindings: Record<string, unknown>) => wrap(base.child(bindings), sink),
	};
}

function safeStringify(value: object): string {
	try {
		return JSON.stringify(value, (_key, entry: unknown) =>
			entry instanceof Error ? { name: entry.name, message: entry.message } : entry,
		);
	} catch {
		return "[unserialisable]";
	}
}

export function createLogger(options: LoggerOptions): Logger {
	const sink = options.webhookUrl ? new WebhookSink(options.webhookUrl) : undefined;
	return wrap(createTransport(options), sink);
}

let rootLogger: Logger = createLogger({ level: "info", pretty: process.env.NODE_ENV !== "production" });

/** Replaces the process-wide logger once the validated environment is available. */
export function setLogger(next: Logger): void {
	rootLogger = next;
}

export function getLogger(): Logger {
	return rootLogger;
}

/** Convenience proxy so modules can `import { logger }` without capturing a stale instance. */
export const logger: Logger = {
	trace: (first: never, second?: string) => getLogger().trace(first, second),
	debug: (first: never, second?: string) => getLogger().debug(first, second),
	info: (first: never, second?: string) => getLogger().info(first, second),
	warn: (first: never, second?: string) => getLogger().warn(first, second),
	error: (first: never, second?: string) => getLogger().error(first, second),
	fatal: (first: never, second?: string) => getLogger().fatal(first, second),
	child: (bindings: Record<string, unknown>) => getLogger().child(bindings),
};
