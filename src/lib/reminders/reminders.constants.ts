import { DAY_MS, MINUTE_MS } from "@config/constants";

/** The identifiers and limits more than one module in this domain reads. */

export const REMINDER_ID = "reminder";

export const REMINDER_LIMITS = {
	minMs: MINUTE_MS,
	maxMs: 365 * DAY_MS,
	/** Per person, wherever they were set. */
	maxActive: 25,
	maxText: 500,
	/** How long a delivery may hold a reminder before another run may try it again. */
	leaseMs: 2 * MINUTE_MS,
	/** A reminder this overdue that still cannot be sent is dropped, so one broken route cannot retry for ever. */
	giveUpAfterMs: DAY_MS,
	/** How many reminders one run of the job delivers, so a backlog cannot hold the loop. */
	perRun: 25,
	/** Reminders per page of `/remind list`, which keeps a page well inside Discord's 40 components. */
	perPage: 6,
} as const;
