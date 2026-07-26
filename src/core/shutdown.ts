import { disconnectDatabase } from "../database/connection";
import { type TestifyClient } from "./client";
import { toError } from "./errors";

let stopping = false;

/** Stops timers, closes the database and disconnects, then exits. */
export async function shutdown(client: TestifyClient, reason: string, code = 0): Promise<void> {
	if (stopping) return;
	stopping = true;

	client.logger.info({ reason }, "Shutting down");

	try {
		client.timers.stopAll();
		await disconnectDatabase();
		await client.destroy();
	} catch (error) {
		client.logger.error({ err: toError(error) }, "Something went wrong while shutting down");
		code = code === 0 ? 1 : code;
	}

	process.exit(code);
}

/** Makes Ctrl+C, `docker stop` and crashes all shut down cleanly. */
export function handleProcessSignals(client: TestifyClient): void {
	process.once("SIGINT", () => void shutdown(client, "SIGINT"));
	process.once("SIGTERM", () => void shutdown(client, "SIGTERM"));

	process.on("uncaughtException", (error) => {
		client.logger.fatal({ err: error }, "Uncaught exception");
		void shutdown(client, "uncaughtException", 1);
	});

	process.on("unhandledRejection", (reason) => {
		client.logger.error({ err: toError(reason) }, "Unhandled rejection");
	});
}
