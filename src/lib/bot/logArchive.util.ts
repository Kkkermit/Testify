import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { type Logger } from "@core/logger";
import { LOG_RANK, type LogRing, logRing } from "@core/logRing";
import { appendLogLines, beginLogRun, endLogRun } from "@database/repositories/logRepository";
import { botVersion } from "@lib/bot/runtime.util";

const FLUSH_MS = 5_000;

/** Writes this run's log lines to the database every few seconds, so the owner console can read them after a restart. */
export class LogArchive {
	private started = false;
	private failing = false;

	constructor(private readonly ring: LogRing = logRing) {}

	/** Records this run, which deletes the oldest past the six kept; a failure costs the history, never the bot. */
	async start(client: TestifyClient): Promise<void> {
		try {
			await beginLogRun({
				run: this.ring.run.id,
				startedAt: new Date(this.ring.run.startedAt),
				version: botVersion(),
			});
		} catch (error) {
			client.logger.warn(
				{ err: toError(error) },
				"[LOGS] This run could not be added to the log history, so its lines are kept in memory only.",
			);
			return;
		}

		this.started = true;
		client.timers.every("log-archive", FLUSH_MS, () => this.flush(client.logger));
	}

	async flush(logger: Logger): Promise<void> {
		if (!this.started) return;

		const records = this.ring.takeUnsent();
		if (records.length === 0) return;

		try {
			await appendLogLines(
				this.ring.run.id,
				records.map((record) => ({
					seq: record.seq,
					at: new Date(record.at),
					level: record.level,
					rank: LOG_RANK[record.level],
					message: record.message,
					context: JSON.stringify(record.context),
				})),
			);
			if (this.failing) logger.info("[LOGS] The database is taking log lines again.");
			this.failing = false;
		} catch (error) {
			this.ring.putBack(records);
			// Once per outage, because this line is itself queued for the database that just refused it.
			if (!this.failing) {
				logger.warn(
					{ err: toError(error) },
					"[LOGS] Log lines could not be saved. They are held in memory until the database answers.",
				);
			}
			this.failing = true;
		}
	}

	/** The last lines and when the run ended, before the database closes. */
	async close(logger: Logger): Promise<void> {
		await this.flush(logger);
		if (!this.started) return;

		try {
			await endLogRun(this.ring.run.id, new Date());
		} catch (error) {
			logger.debug({ err: toError(error) }, "[LOGS] The end of this run could not be recorded.");
		}
	}
}

export const logArchive = new LogArchive();
