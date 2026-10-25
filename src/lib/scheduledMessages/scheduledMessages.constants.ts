import { HOUR_MS, MINUTE_MS } from "@config/constants";

export const SCHEDULE_COMMAND = "schedule";

export const SCHEDULE_PANEL_ID = "schedule";

export const SCHEDULE_TIMING = {
	/** How long a post may hold its message before another run may try it again. */
	leaseMs: 2 * MINUTE_MS,
	/** A post later than this is skipped rather than sent, so a stale announcement is never posted. */
	lateByMs: HOUR_MS,
	/** How many posts one run of the job sends, so a backlog cannot hold the loop. */
	perRun: 25,
} as const;
