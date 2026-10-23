import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { claimDueReminder, finishReminder } from "@database/repositories/reminderRepository";
import { deliverReminder, REMINDER_LIMITS } from "@lib/reminders";

/** Each due reminder is claimed for a lease and deleted only once it is sent, so a restart mid-send repeats it. */
export async function deliverDueReminders(client: TestifyClient, now: Date = new Date()): Promise<void> {
	for (let processed = 0; processed < REMINDER_LIMITS.perRun; processed += 1) {
		const reminder = await claimDueReminder(now, REMINDER_LIMITS.leaseMs);
		if (reminder === null) return;

		try {
			const where = await deliverReminder(client, reminder);
			if (where === null) {
				client.logger.debug(
					{ userId: reminder.userId },
					"[REMINDERS] A reminder could not reach its owner by channel or DM, so it was dropped.",
				);
			}
			await finishReminder(reminder.id);
		} catch (error) {
			const stale = now.getTime() - reminder.dueAt.getTime() > REMINDER_LIMITS.giveUpAfterMs;
			client.logger.warn(
				{ err: toError(error), userId: reminder.userId },
				stale
					? "[REMINDERS] A reminder a day overdue still could not be sent, so it was dropped."
					: "[REMINDERS] A reminder could not be sent. It will be tried again in a couple of minutes.",
			);
			if (stale) await finishReminder(reminder.id);
		}
	}
}
