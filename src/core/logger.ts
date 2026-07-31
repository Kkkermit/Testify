import pino from "pino";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export type Logger = pino.Logger;

/**
 * Pretty, colourised output when you are watching a terminal, and plain JSON when you are not — which is what a
 * hosting platform wants in its log drain.
 */
export function createLogger(level: LogLevel, pretty: boolean = process.stdout.isTTY === true): Logger {
	if (!pretty) return pino({ level });

	return pino({
		level,
		transport: {
			target: "pino-pretty",
			options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
		},
	});
}
