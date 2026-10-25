import { MINUTE_MS } from "@config/constants";
import { SCHEDULE_LIMITS } from "@testify/shared";

export const SCHEDULE_COMMAND = "schedule";

export const SCHEDULE_PANEL_ID = "schedule";

export const SCHEDULE_TIMING = {
	/** How long a post may hold its message before another run may try it again. */
	leaseMs: 2 * MINUTE_MS,
	lateByMs: SCHEDULE_LIMITS.lateByMinutes * MINUTE_MS,
	/** How many posts one run of the job sends, so a backlog cannot hold the loop. */
	perRun: 25,
} as const;
