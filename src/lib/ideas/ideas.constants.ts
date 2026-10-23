import { MINUTE_MS } from "@config/constants";

/** The identifiers more than one module in this domain reads. */

/** The buttons on each posted idea, and the reason form staff fill in. */
export const IDEA_ID = "idea";

/** The manager's panel behind `/idea settings`. */
export const IDEA_SETTINGS_ID = "ideasettings";

/** The command's name, which its switch and the gate on every press are keyed by. */
export const IDEA_COMMAND = "idea";

/** The pause between one member's ideas, so a board cannot be flooded. */
export const IDEA_PAUSE_MS = MINUTE_MS;
