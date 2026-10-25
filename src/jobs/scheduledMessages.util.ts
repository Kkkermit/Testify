import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { claimDueSchedule, settleSchedule } from "@database/repositories/scheduledMessageRepository";
import { deliverSchedule, nextAfter, SCHEDULE_TIMING } from "@lib/scheduledMessages";

/** Each due post is claimed for a lease and moved on only once it is sent, so a restart mid-send posts it again. */
export async function postDueSchedules(client: TestifyClient, now: Date = new Date()): Promise<void> {
	for (let processed = 0; processed < SCHEDULE_TIMING.perRun; processed += 1) {
		const due = await claimDueSchedule(now, SCHEDULE_TIMING.leaseMs);
		if (due === null) return;

		const next = nextAfter(due.nextAt, due.repeat, now);
		const where = { guildId: due.guildId, channelId: due.channelId };

		if (now.getTime() - due.nextAt.getTime() > SCHEDULE_TIMING.lateByMs) {
			client.logger.info(where, "[SCHEDULED] A scheduled message was over an hour late, so that post was skipped.");
			await settleSchedule(due, next);
			continue;
		}

		try {
			if ((await deliverSchedule(client, due)) === "unreachable") {
				client.logger.info(
					where,
					"[SCHEDULED] A scheduled message could not be posted, because its channel is gone or the bot may not post there.",
				);
			}
			await settleSchedule(due, next);
		} catch (error) {
			// Left claimed, so it is tried again once the lease runs out, and skipped once it is an hour late.
			client.logger.warn(
				{ ...where, err: toError(error) },
				"[SCHEDULED] A scheduled message could not be posted. It will be tried again in a couple of minutes.",
			);
		}
	}
}
