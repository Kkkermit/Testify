import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { ErrorThrottle, reportSurvivable } from "@core/resilience";
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

	// Nothing here exits. A bot serving many servers must not go dark because one handler threw, so an
	// unexpected failure is recorded and the process carries on. Only a signal or the owner console stops it.
	const throttle = new ErrorThrottle();

	process.on("uncaughtException", (error) => {
		reportSurvivable(client.logger, throttle, "UNCAUGHT", error);
	});

	process.on("unhandledRejection", (reason) => {
		reportSurvivable(client.logger, throttle, "UNHANDLED_REJECTION", reason);
	});

	// discord.js emits these on the client, and an unhandled `error` event on an EventEmitter throws — which is
	// the likeliest way a gateway hiccup would otherwise have become a fatal exception.
	client.on("error", (error) => {
		reportSurvivable(client.logger, throttle, "GATEWAY", error);
	});

	client.on("shardError", (error, shardId) => {
		reportSurvivable(client.logger, throttle, `SHARD_${String(shardId)}`, error);
	});
}
