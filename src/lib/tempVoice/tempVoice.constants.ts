import { SECOND_MS } from "@config/constants";

/** The identifiers more than one module in this domain reads. */

/** The manager's panel behind `/temp-voice`. */
export const TEMP_VOICE_SETTINGS_ID = "tempvoicesettings";

/** The command's name. */
export const TEMP_VOICE_COMMAND = "temp-voice";

/** Between one member's new channels, so hopping in and out of the lobby cannot fill the server with channels. */
export const MAKE_PAUSE_MS = 10 * SECOND_MS;

/** How many made channels one sweep looks at, so a large backlog is worked through over several runs. */
export const SWEEP_BATCH = 500;
