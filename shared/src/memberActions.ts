import { z } from "zod";
import { WARNING_LIMITS } from "./memberDetail";
import { snowflake } from "./schemas";
import { plainLine } from "./text";

/** What the member page does beyond warnings and money: a timeout, their roles and their nickname. */

/** The lengths a warning's step offers, and Discord's own ceiling of 28 days. */
export const MEMBER_TIMEOUT_MINUTES = [5, 10, 30, 60, 360, 1_440, 10_080, 40_320] as const;

export const MEMBER_ACTION_LIMITS = {
	/** Discord's own limit on a nickname. */
	maxNickname: 32,
	/** More than any server's role list, so a hand-written request cannot send a flood. */
	maxRoles: 250,
} as const;

export const timeoutBody = z.object({
	minutes: z.union(MEMBER_TIMEOUT_MINUTES.map((minutes) => z.literal(minutes))),
	reason: plainLine(WARNING_LIMITS.minReason, WARNING_LIMITS.maxReason),
	confirm: z.string().max(64),
});

export type TimeoutBody = z.infer<typeof timeoutBody>;

export const nicknameBody = z.object({
	nickname: plainLine(1, MEMBER_ACTION_LIMITS.maxNickname).nullable(),
});

export type NicknameBody = z.infer<typeof nicknameBody>;

/** The whole set of roles the reader may hand out, as they should be; roles out of the reader's reach are left alone. */
export const memberRolesBody = z.object({
	roleIds: z.array(snowflake).max(MEMBER_ACTION_LIMITS.maxRoles),
});

export type MemberRolesBody = z.infer<typeof memberRolesBody>;

export interface MemberRoleChoice {
	id: string;
	name: string;
	colour: string | null;
	held: boolean;
}

/** Only the roles the person reading may give or take, highest first. */
export interface MemberRoles {
	roles: MemberRoleChoice[];
}
