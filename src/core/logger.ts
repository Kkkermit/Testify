import pino from "pino";
import { type LogRecord, type LogRing, logRing } from "@core/logRing";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export type Logger = pino.Logger;

const LEVELS: Record<number, LogLevel> = { 10: "trace", 20: "debug", 30: "info", 40: "warn", 50: "error", 60: "fatal" };

/** pino takes either `(message)` or `(context, message)`, and the ring wants them apart. */
export function splitLogArgs(args: unknown[]): Pick<LogRecord, "message" | "context"> {
	const [first, second] = args;

	if (typeof first === "object" && first !== null) {
		return { context: first as Record<string, unknown>, message: typeof second === "string" ? second : "" };
	}

	return { context: {}, message: typeof first === "string" ? first : "" };
}

/**
 * Pretty output on a terminal, JSON otherwise. Every line is also copied into `ring` through a hook, so `LOG_LEVEL`
 * still decides what exists.
 */
export function createLogger(
	level: LogLevel,
	pretty: boolean = process.stdout.isTTY === true,
	ring: LogRing = logRing,
): Logger {
	const options: pino.LoggerOptions = {
		level,
		hooks: {
			logMethod(args, method, methodLevel) {
				// Every level is captured, so the console can filter after the fact.
				ring.push({ at: Date.now(), level: LEVELS[methodLevel] ?? "info", ...splitLogArgs([...args]) });

				return method.apply(this, args);
			},
		},
	};

	if (!pretty) return pino(options);

	return pino({
		...options,
		transport: {
			target: "pino-pretty",
			options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
		},
	});
}
