import pino from "pino";
import { type LogRecord, type LogRing, logRing } from "@core/logRing";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export type Logger = pino.Logger;

const LEVELS: Record<number, LogLevel> = { 10: "trace", 20: "debug", 30: "info", 40: "warn", 50: "error", 60: "fatal" };

/** Below this nothing reaches the ring: a few hundred slots spent on per-message debug lines hold no answers. */
const RING_FLOOR = 30;

/** pino takes either `(message)` or `(context, message)`, and the ring wants them apart. */
export function splitLogArgs(args: unknown[]): Pick<LogRecord, "message" | "context"> {
	const [first, second] = args;

	if (typeof first === "object" && first !== null) {
		return { context: first as Record<string, unknown>, message: typeof second === "string" ? second : "" };
	}

	return { context: {}, message: typeof first === "string" ? first : "" };
}

/**
 * Pretty, colourised output when you are watching a terminal, and plain JSON when you are not — which is what a
 * hosting platform wants in its log drain.
 *
 * Everything at info and above is copied into `ring` as well, which is what the owner console reads. A hook
 * rather than a second transport, so the copy cannot change what is printed.
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
				if (methodLevel >= RING_FLOOR) {
					ring.push({ at: Date.now(), level: LEVELS[methodLevel] ?? "info", ...splitLogArgs([...args]) });
				}

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
