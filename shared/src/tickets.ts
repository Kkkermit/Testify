import { z } from "zod";
import { plainLine, plainText } from "./text";

export const TICKET_LIMITS = { maxDescription: 1_000, maxButtonLabel: 40 } as const;

const snowflake = z.string().regex(/^\d{17,20}$/, "is not an ID");

export interface TicketSettings {
	enabled: boolean;
	panelChannelId: string | null;
	categoryId: string | null;
	transcriptChannelId: string | null;
	staffRoleId: string | null;
	description: string;
	buttonLabel: string;
	posted: boolean;
	openTickets: number;
}

export const ticketPatch = z
	.object({
		panelChannelId: snowflake,
		categoryId: snowflake,
		transcriptChannelId: snowflake,
		staffRoleId: snowflake,
		description: plainText(1, TICKET_LIMITS.maxDescription),
		buttonLabel: plainLine(1, TICKET_LIMITS.maxButtonLabel),
		/** Posting is its own decision: choosing a channel must not drop a panel into it. */
		publish: z.boolean(),
	})
	.partial();

export type TicketPatch = z.infer<typeof ticketPatch>;

/** What is still missing before a panel can be posted, in the words the form shows. */
export function ticketBlocked(draft: {
	panelChannelId: string | null;
	categoryId: string | null;
	transcriptChannelId: string | null;
	staffRoleId: string | null;
}): string | null {
	if (draft.panelChannelId === null) return "Choose where the panel is posted.";
	if (draft.categoryId === null) return "Choose the category new tickets are created in.";
	if (draft.transcriptChannelId === null) return "Choose where transcripts are sent.";
	if (draft.staffRoleId === null) return "Choose the role that handles tickets.";

	return null;
}
