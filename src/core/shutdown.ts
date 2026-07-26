import { disconnectDatabase } from "../database/connection";
import { type TestifyClient } from "./client";
import { toError } from "./errors";
import { type Logger } from "./logger";

/**
 * Graceful shutdown: clear every registered timer, close the database, then close
 * the gateway. The previous process handlers were registered twice, logged
 * uncaught exceptions without exiting, and listened for an event Node does not
 * emit.
 */

let shuttingDown = false;

export function registerShutdownHandlers(client: TestifyClient, logger: Logger): void {
	const stop = (signal: string, code: number): void => {
		void shutdown(client, logger, signal, code);
	};

	process.once("SIGINT", () => stop("SIGINT", 0));
	process.once("SIGTERM", () => stop("SIGTERM", 0));

	process.on("uncaughtException", (error) => {
		logger.fatal({ err: error }, "Uncaught exception");
		stop("uncaughtException", 1);
	});

	process.on("unhandledRejection", (reason) => {
		logger.error({ err: toError(reason) }, "Unhandled rejection");
	});

	process.on("warning", (warning) => {
		logger.warn({ name: warning.name, message: warning.message }, "Process warning");
	});
}

export async function shutdown(client: TestifyClient, logger: Logger, reason: string, exitCode = 0): Promise<void> {
	if (shuttingDown) return;
	shuttingDown = true;

	logger.info({ reason, timers: client.timers.names() }, "Shutting down");

	try {
		client.timers.clearAll();
		await disconnectDatabase();
		await client.destroy();
	} catch (error) {
		logger.error({ err: toError(error) }, "Error during shutdown");
		exitCode = exitCode === 0 ? 1 : exitCode;
	}

	logger.info("Shutdown complete");
	process.exit(exitCode);
}

/** Test seam — lets a suite exercise the handler registration more than once. */
export function resetShutdownState(): void {
	shuttingDown = false;
}
