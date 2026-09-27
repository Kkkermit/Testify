import { type BypassPermission, type AuditEvent } from "@testify/shared";

/** The types more than one module in this domain shares. */

export interface AntiLinkPanelState {
	enabled: boolean;
	bypass: BypassPermission;
	note?: string;
}

export interface AuditPanelState {
	channelId: string | null;
	/** `["all"]` means every event, which is how the config has always stored it. */
	enabled: string[];
	/** True when the panel is showing edits that are not in the database yet. */
	dirty?: boolean;
	/** Where the same thing can be configured in a browser, when the dashboard is switched on. */
	hint?: string | null;
}

/** What the admin has picked in one message, before Save writes it. */
export interface AuditDraft {
	channelId: string | null;
	events: AuditEvent[];
}
