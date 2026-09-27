import { COUNTING_DEFAULT_MAX } from "@config/constants";

/** The identifiers, limits and defaults more than one module in this domain reads. */

export const AUTOROLE_PANEL_ID = "autorole";

/** Discord's cap on a role select, and plenty for a join list. */
export const MAX_AUTO_ROLES = 10;

export const COUNTING_PANEL_ID = "counting";

export const COUNTING_LIMITS = { minGoal: 10, maxGoal: COUNTING_DEFAULT_MAX } as const;

export const PREFIX_PANEL_ID = "prefixsetup";

export const PREFIX_LIMITS = { maxLength: 5 } as const;

export const VERIFY_PANEL_ID = "verifysetup";

export const VOICESTATS_PANEL_ID = "voicestats";
