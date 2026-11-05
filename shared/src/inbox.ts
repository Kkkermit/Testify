import { type WatchedPermission } from "./api";
import { type FeatureKey } from "./places";

export const INBOX_LIMITS = {
	/** How many tickets and ideas are listed before the page says how many more there are. */
	shown: 5,
} as const;

export interface InboxTicket {
	channelId: string;
	ticketId: string;
	ownerName: string;
	openedAt: string;
}

export interface InboxIdea {
	id: string;
	number: number;
	text: string;
	authorName: string;
	up: number;
	down: number;
	createdAt: string;
}

export interface InboxChannelProblem {
	feature: FeatureKey;
	label: string;
	channelId: string;
	problem: "cannotPost" | "missing";
}

export interface GuildInbox {
	/** Open tickets nobody has claimed yet, oldest first. */
	tickets: { total: number; items: InboxTicket[] };
	ideas: { total: number; items: InboxIdea[] };
	permissions: WatchedPermission[];
	channels: InboxChannelProblem[];
}

export function inboxCount(inbox: GuildInbox): number {
	return inbox.tickets.total + inbox.ideas.total + inbox.permissions.length + inbox.channels.length;
}
