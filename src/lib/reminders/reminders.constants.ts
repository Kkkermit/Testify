import { DAY_MS, MINUTE_MS } from "@config/constants";
import { REMINDER_RULES } from "@testify/shared";

export const REMINDER_ID = "reminder";

export const REMINDER_LIMITS = {
	...REMINDER_RULES,
	maxActive: 25,
	/** How long a delivery may hold a reminder before another run may try it again. */
	leaseMs: 2 * MINUTE_MS,
	/** A reminder this overdue that still cannot be sent is dropped, so one broken route cannot retry for ever. */
	giveUpAfterMs: DAY_MS,
	/** How many reminders one run of the job delivers, so a backlog cannot hold the loop. */
	perRun: 25,
	/** Reminders per page of `/remind list`, which keeps a page well inside Discord's 40 components. */
	perPage: 6,
} as const;
