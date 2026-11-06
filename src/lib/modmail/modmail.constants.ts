/** Every control a conversation has: Write, the server picker, its form, and Close on both sides. */
export const MODMAIL_ID = "modmail";

/** The manager's panel behind `/modmail settings`. */
export const MODMAIL_SETTINGS_ID = "modmailsettings";

/** The command's name, which its switch and the gate on every press are keyed by. */
export const MODMAIL_COMMAND = "modmail";

/** The form behind the right-click Report message. */
export const REPORT_FORM_ID = "report";

/** How often one person may report, and how much of a report is kept in the staff post. */
export const REPORT_LIMITS = { perHour: 5, reasonLength: 500, quoteLength: 1_000, remembered: 10_000 };

/** Anybody may report a message; switching `/modmail` off switches reporting off with it. */
export const REPORT_MENU = { switchedBy: MODMAIL_COMMAND };
