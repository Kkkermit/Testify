import { z } from "zod";
import { pagination, snowflake } from "./schemas";
import { plainText } from "./text";

export const APPEAL_LIMITS = {
	minText: 20,
	maxText: 1_500,
	maxReason: 500,
	/** How many days after a refusal the same person may appeal again. */
	cooldownChoices: [7, 14, 30, 60, 90],
	defaultCooldownDays: 30,
	/** A decided appeal is kept this long, so a refusal can still hold back the next one. */
	keepDays: 180,
	perPage: 10,
	/** Appeals one person may send a minute, across every server. */
	perMinute: 3,
} as const;

export const APPEAL_STATUSES = ["open", "accepted", "refused"] as const;

export type AppealStatus = (typeof APPEAL_STATUSES)[number];

export type AppealCooldown = (typeof APPEAL_LIMITS.cooldownChoices)[number];

export interface AppealSettings {
	enabled: boolean;
	channelId: string | null;
	/** False when the bot cannot post in the channel. */
	canSend: boolean;
	cooldownDays: AppealCooldown;
	/** False when this bot runs no dashboard, which is the only place an appeal can be written. */
	dashboard: boolean;
	open: number;
}

const cooldownDays = z.union(APPEAL_LIMITS.cooldownChoices.map((days) => z.literal(days)));

export const appealSettingsPatch = z
	.object({
		enabled: z.boolean().optional(),
		channelId: snowflake.nullable().optional(),
		cooldownDays: cooldownDays.optional(),
	})
	.refine((patch) => Object.values(patch).some((value) => value !== undefined), "nothing to change");

export type AppealSettingsPatch = z.infer<typeof appealSettingsPatch>;

/** Reads a stored pause back, so an old record or a hand-edited one gets the default rather than an odd length. */
export function cooldownOf(stored: number | null | undefined): AppealCooldown {
	return APPEAL_LIMITS.cooldownChoices.find((days) => days === stored) ?? APPEAL_LIMITS.defaultCooldownDays;
}

/** What staff see: one appeal, who sent it and what was decided. */
export interface AppealRow {
	id: string;
	userId: string;
	username: string;
	text: string;
	status: AppealStatus;
	reason: string;
	decidedByName: string | null;
	decidedAt: string | null;
	createdAt: string;
	messageUrl: string | null;
}

/** A refusal says why, so the person can tell what to change before they try again. */
export const appealDecision = z.discriminatedUnion("status", [
	z.object({ status: z.literal("accepted"), reason: plainText(0, APPEAL_LIMITS.maxReason) }),
	z.object({ status: z.literal("refused"), reason: plainText(1, APPEAL_LIMITS.maxReason) }),
]);

export type AppealDecision = z.infer<typeof appealDecision>;

export const appealParams = z.object({ appealId: z.string().regex(/^[a-f\d]{24}$/, "must be an appeal id") });

export const appealListQuery = pagination.extend({
	status: z.enum(["all", ...APPEAL_STATUSES]).default("open"),
	perPage: z.coerce.number().int().min(1).max(50).default(APPEAL_LIMITS.perPage),
});

export type AppealFilter = z.infer<typeof appealListQuery>["status"];

/** What the person appealing sees of their own appeal; never who decided it. */
export interface OwnAppeal {
	id: string;
	guildId: string;
	status: AppealStatus;
	text: string;
	reason: string;
	createdAt: string;
	decidedAt: string | null;
}

/** A server that has banned the reader and takes appeals. */
export interface AppealableServer {
	guildId: string;
	name: string;
	iconUrl: string | null;
	/** The appeal waiting for a decision, if one is. */
	open: OwnAppeal | null;
	/** When a refused appeal allows the next one; null when one may be sent now. */
	againAt: string | null;
}

export interface OwnAppeals {
	servers: AppealableServer[];
	/** Every appeal the reader has sent, newest first, including to servers that no longer take them. */
	appeals: (OwnAppeal & { guildName: string | null })[];
}

export const appealBody = z.object({ text: plainText(APPEAL_LIMITS.minText, APPEAL_LIMITS.maxText) });

export const appealServerParams = z.object({ guildId: snowflake });

/** When somebody refused at `refusedAt` may appeal again, or null when they already may. */
export function appealAgainAt(
	refusedAt: Date | string | null,
	days: AppealCooldown,
	now: number = Date.now(),
): Date | null {
	if (refusedAt === null) return null;

	const again = new Date(new Date(refusedAt).getTime() + days * 86_400_000);
	return again.getTime() > now ? again : null;
}
