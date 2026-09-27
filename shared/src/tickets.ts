import { z } from "zod";
import { type Problem, problem } from "./problems";
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

interface TicketDestinations {
	panelChannelId: string | null;
	categoryId: string | null;
	transcriptChannelId: string | null;
	staffRoleId: string | null;
}

/** Everything still missing before a panel can be posted, in the order the form lists it. */
export function ticketMissing(draft: TicketDestinations): Problem[] {
	return [
		draft.panelChannelId === null ? problem("ticket.panelChannel") : null,
		draft.categoryId === null ? problem("ticket.category") : null,
		draft.transcriptChannelId === null ? problem("ticket.transcriptChannel") : null,
		draft.staffRoleId === null ? problem("ticket.staffRole") : null,
	].filter((missing) => missing !== null);
}

export function ticketBlocked(draft: TicketDestinations): Problem | null {
	return ticketMissing(draft)[0] ?? null;
}
