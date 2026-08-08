import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { disconnectDatabase } from "@database/connection";
import { printReloading } from "@lib/banner.util";

let stopping = false;

/** Stops timers, closes the database and disconnects, then exits. */
export async function shutdown(client: TestifyClient, reason: string, code = 0): Promise<void> {
	if (stopping) return;
	stopping = true;

	client.logger.info({ reason }, "Shutting down");

	try {
		client.timers.stopAll();
		await client.api?.close();
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

	process.once("SIGTERM", () => {
		// Under `npm run dev` tsx restarts the bot by killing it with SIGTERM, so
		// in development this signal means "a file was saved", not "stop".
		if (client.env.NODE_ENV === "development") printReloading();
		void shutdown(client, "SIGTERM");
	});

	process.on("uncaughtException", (error) => {
		client.logger.fatal({ err: error }, "[FATAL] Uncaught exception. Shutting down rather than continuing.");
		void shutdown(client, "uncaughtException", 1);
	});

	// Node terminates on an unhandled rejection by default; a listener that only logs would quietly disable that
	// and leave the process running on state nothing can vouch for.
	process.on("unhandledRejection", (reason) => {
		client.logger.fatal(
			{ err: toError(reason) },
			"[FATAL] Unhandled promise rejection. Shutting down rather than continuing.",
		);
		void shutdown(client, "unhandledRejection", 1);
	});
}
