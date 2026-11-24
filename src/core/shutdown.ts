import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { ErrorThrottle, reportSurvivable } from "@core/resilience";
import { disconnectDatabase } from "@database/connection";
import { printReloading } from "@lib/bot/banner.util";
import { flushCommandLog } from "@lib/bot/commandLog.util";
import { closeLiveFeed } from "@lib/bot/liveFeed.util";
import { logArchive } from "@lib/bot/logArchive.util";
import { stopEventLoopMonitor } from "@lib/bot/performance.util";
import { flushActivity } from "@lib/info/insights.util";
import { destroyAllSessions } from "@lib/music/musicSession.util";

let stopping = false;

/** True from the first signal on, so start-up stops instead of reporting what shutting down undid. */
export function isShuttingDown(): boolean {
	return stopping;
}

/** Stops timers, closes the database and disconnects, then exits. */
export async function shutdown(client: TestifyClient, reason: string, code = 0): Promise<void> {
	if (stopping) return;
	stopping = true;

	client.logger.info({ reason }, "[SHUTDOWN] Shutting down.");

	// In this order, and each on its own, so one that fails cannot leave the database open or a log unflushed.
	const steps: [step: string, run: () => unknown][] = [
		["timers", () => client.timers.stopAll()],
		["eventLoop", stopEventLoopMonitor],
		["music", destroyAllSessions],
		["dashboard", () => client.api?.close()],
		["liveFeed", () => closeLiveFeed(client)],
		// Counted messages live in memory until a flush, so the last minute's are written before the database goes.
		["insights", () => flushActivity(client.logger)],
		["commandLog", () => flushCommandLog(client)],
		// Before the archive closes, so anything it says on the way out is kept, and before the client it listens to goes.
		["shardlens", () => client.shardlens?.shutdown()],
		["logArchive", () => logArchive.close(client.logger)],
		["database", disconnectDatabase],
		["discord", () => client.destroy()],
		// Last, so everything the SDK flushed above has reached it.
		["collector", () => client.lensTarget.embedded?.close()],
	];

	let failed = false;
	for (const [step, run] of steps) {
		try {
			await run();
		} catch (error) {
			failed = true;
			client.logger.error({ err: toError(error), step }, "[SHUTDOWN_ERROR] Something went wrong while shutting down.");
		}
	}

	process.exit(failed && code === 0 ? 1 : code);
}

/** Makes Ctrl+C and `docker stop` shut down cleanly. */
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
