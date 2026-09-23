import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { ErrorThrottle, reportSurvivable } from "@core/resilience";
import { disconnectDatabase } from "@database/connection";
import { printReloading } from "@lib/bot/banner.util";
import { destroyAllSessions } from "@lib/music/musicSession.util";

let stopping = false;

/** Stops timers, closes the database and disconnects, then exits. */
export async function shutdown(client: TestifyClient, reason: string, code = 0): Promise<void> {
	if (stopping) return;
	stopping = true;

	client.logger.info({ reason }, "Shutting down");

	try {
		client.timers.stopAll();
		destroyAllSessions();
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
		// `tsx watch` restarts the bot with SIGTERM, so in development it means a file was saved.
		if (client.env.NODE_ENV === "development") printReloading();
		void shutdown(client, "SIGTERM");
	});

	// Nothing here exits: an unexpected failure is recorded and the process carries on.
	const throttle = new ErrorThrottle();

	process.on("uncaughtException", (error) => {
		reportSurvivable(client.logger, throttle, "UNCAUGHT", error);
	});

	process.on("unhandledRejection", (reason) => {
		reportSurvivable(client.logger, throttle, "UNHANDLED_REJECTION", reason);
	});

	// An unhandled `error` event on an EventEmitter throws, so the client's are caught here.
	client.on("error", (error) => {
		reportSurvivable(client.logger, throttle, "GATEWAY", error);
	});

	client.on("shardError", (error, shardId) => {
		reportSurvivable(client.logger, throttle, `SHARD_${String(shardId)}`, error);
	});
}
