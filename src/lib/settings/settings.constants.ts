import { COUNTING_DEFAULT_MAX } from "@config/constants";
import { SETTINGS_LIMITS } from "@testify/shared";

export const AUTOROLE_PANEL_ID = "autorole";

/** The dashboard's limit too, so a list saved on the web always fits the panel's menu. */
export const MAX_AUTO_ROLES = SETTINGS_LIMITS.maxAutoRoles;

export const COUNTING_PANEL_ID = "counting";

export const COUNTING_LIMITS = { minGoal: 10, maxGoal: COUNTING_DEFAULT_MAX } as const;

export const PREFIX_PANEL_ID = "prefixsetup";

/** The dashboard's limit too, or a longer prefix saved there could not be pre-filled into the panel's form. */
export const PREFIX_LIMITS = { maxLength: SETTINGS_LIMITS.maxPrefix } as const;

export const VERIFY_PANEL_ID = "verifysetup";

export const VOICESTATS_PANEL_ID = "voicestats";
