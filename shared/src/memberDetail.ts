import { z } from "zod";
import { plainLine } from "./text";

export const WARNING_LIMITS = { minReason: 1, maxReason: 500 } as const;

export interface MemberWarning {
	id: string;
	reason: string;
	byId: string;
	byTag: string;
	at: string;
	/** True once the reason has been rewritten, so the page can say the record is not the original. */
	edited: boolean;
}

export interface MemberSoftban {
	reason: string;
	moderatorId: string;
	expiresAt: string;
}

export interface MemberDetail {
	userId: string;
	displayName: string;
	username: string;
	avatarUrl: string | null;
	/** False once somebody leaves; their warnings, balance and XP all outlive the membership. */
	inGuild: boolean;
	isBot: boolean;
	joinedAt: string | null;
	roles: { id: string; name: string; colour: string | null }[];
	economy: { wallet: number; bank: number; total: number; rank: number | null } | null;
	levels: { level: number; xp: number; rank: number | null } | null;
	warnings: MemberWarning[];
	softban: MemberSoftban | null;
	/** Why the person reading may not act on this member, in the words the page shows. Null means they may. */
	moderationProblem: string | null;
}

const snowflakeParam = z.string().regex(/^\d{17,20}$/, "must be a Discord ID");

export const memberParams = z.object({ guildId: snowflakeParam, userId: snowflakeParam });

/** `randomUUID().slice(0, 8)` — bounded here so an unvalidated id cannot reach a Mongo filter. */
export const warningParams = memberParams.extend({
	warnId: z.string().regex(/^[a-f0-9-]{4,36}$/, "is not a warning ID"),
});

export const warningBody = z.object({
	reason: plainLine(WARNING_LIMITS.minReason, WARNING_LIMITS.maxReason),
});

export type WarningBody = z.infer<typeof warningBody>;

/** What is still missing before a warning can be issued, in the words the form shows. */
export function warningProblem(reason: string): string | null {
	const trimmed = reason.trim();

	if (trimmed.length < WARNING_LIMITS.minReason) return "Say why they are being warned.";
	if (trimmed.length > WARNING_LIMITS.maxReason) {
		return `A reason cannot be longer than ${String(WARNING_LIMITS.maxReason)} characters.`;
	}

	return null;
}
