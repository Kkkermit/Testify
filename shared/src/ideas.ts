import { z } from "zod";
import { pagination, snowflake } from "./schemas";
import { plainText } from "./text";

/** A server's own idea board, which is not `/suggest`: that one goes to the bot's developers. */

export const IDEA_LIMITS = {
	maxText: 1_000,
	maxReason: 500,
	perPage: 10,
} as const;

export const IDEA_STATUSES = ["open", "accepted", "declined"] as const;

export type IdeaStatus = (typeof IDEA_STATUSES)[number];

export interface IdeaSettings {
	enabled: boolean;
	channelId: string | null;
	/** False when the bot cannot post in the channel, so a board that will never appear says so. */
	canSend: boolean;
	counts: Record<IdeaStatus, number>;
}

export interface IdeaRow {
	id: string;
	number: number;
	authorId: string;
	authorName: string;
	text: string;
	status: IdeaStatus;
	reason: string;
	decidedByName: string | null;
	decidedAt: string | null;
	up: number;
	down: number;
	createdAt: string;
	/** A link to the post, while there is one. */
	messageUrl: string | null;
}

export const ideaSettingsPatch = z
	.object({
		enabled: z.boolean().optional(),
		channelId: snowflake.nullable().optional(),
	})
	.refine((patch) => patch.enabled !== undefined || patch.channelId !== undefined, "nothing to change");

export type IdeaSettingsPatch = z.infer<typeof ideaSettingsPatch>;

/** Reopening is a decision too, which is how a mistaken accept is undone. */
export const ideaDecision = z.object({
	status: z.enum(IDEA_STATUSES),
	reason: plainText(0, IDEA_LIMITS.maxReason),
});

export type IdeaDecision = z.infer<typeof ideaDecision>;

export const ideaParams = z.object({ ideaId: z.string().regex(/^[a-f\d]{24}$/, "must be an idea id") });

export const ideaListQuery = pagination.extend({
	status: z.enum(["all", ...IDEA_STATUSES]).default("all"),
	perPage: z.coerce.number().int().min(1).max(50).default(IDEA_LIMITS.perPage),
});

export type IdeaFilter = z.infer<typeof ideaListQuery>["status"];
