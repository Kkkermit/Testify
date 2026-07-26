import pino from "pino";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export type Logger = pino.Logger;

/**
 * Pretty, colourised output while developing and plain JSON in production, which
 * is what hosting platforms expect.
 */
export function createLogger(level: LogLevel, pretty: boolean): Logger {
	if (!pretty) return pino({ level });

	return pino({
		level,
		transport: {
			target: "pino-pretty",
			options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
		},
	});
}
