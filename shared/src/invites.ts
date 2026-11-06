import { z } from "zod";
import { snowflake } from "./schemas";

export const INVITE_LIMITS = {
	/** A join is kept this long, then MongoDB lets it go. */
	keepDays: 365,
	top: 10,
	recent: 20,
} as const;

export interface InviteSettings {
	enabled: boolean;
	logChannelId: string | null;
	/** False when the bot lacks Manage Server, without which Discord will not list a server's invites. */
	canRead: boolean;
	canSend: boolean;
}

export const inviteSettingsPatch = z
	.object({ enabled: z.boolean().optional(), logChannelId: snowflake.nullable().optional() })
	.refine((patch) => Object.values(patch).some((value) => value !== undefined), "nothing to change");

export type InviteSettingsPatch = z.infer<typeof inviteSettingsPatch>;

/** How many members somebody's invites brought in, and how many of them are still here. */
export interface InviterStanding {
	userId: string;
	name: string;
	joins: number;
	left: number;
}

/** How one member joined; `code` and the inviter are null when it could not be told. */
export interface InviteJoin {
	memberId: string;
	memberName: string;
	inviterId: string | null;
	inviterName: string | null;
	code: string | null;
	vanity: boolean;
	joinedAt: string;
	leftAt: string | null;
}

export interface InviteOverview {
	settings: InviteSettings;
	top: InviterStanding[];
	recent: InviteJoin[];
}

/** What an invite looked like when last seen: how often it had been used and whose it is. */
export interface InviteSnapshot {
	uses: number;
	inviterId: string | null;
	inviterName: string | null;
}

/** The invite a join used, or null when no single one can be told apart; a guess is never made. */
export function usedInvite(
	before: ReadonlyMap<string, InviteSnapshot>,
	after: ReadonlyMap<string, InviteSnapshot>,
): string | null {
	const grown = [...after].filter(([code, invite]) => invite.uses > (before.get(code)?.uses ?? 0));
	if (grown.length === 1) return grown[0]?.[0] ?? null;
	if (grown.length > 1) return null;

	// An invite that reached its last use is deleted by Discord, so it shows only as missing.
	const gone = [...before.keys()].filter((code) => !after.has(code));
	return gone.length === 1 ? (gone[0] ?? null) : null;
}
