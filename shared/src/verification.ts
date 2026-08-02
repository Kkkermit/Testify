import { z } from "zod";
import { snowflake } from "./schemas";
import { plainText } from "./text";

/**
 * Verification: a button in a public channel that hands out a role once somebody types a short code back. The
 * dashboard and the Discord panel write the same three fields, so neither can configure something the other
 * cannot render.
 */

export const VERIFY_LIMITS = {
	maxMessage: 1_000,
} as const;

export interface VerificationConfigResponse {
	/** False when no record exists at all, which is how the bot stores "off". */
	enabled: boolean;
	channelId: string | null;
	roleId: string | null;
	message: string;
	/** True once the public panel has been posted, so the page can offer to post or to re-post it. */
	posted: boolean;
	verifiedCount: number;
	/** Discord refuses a role at or above the bot's own, and the form is the only place to say so in time. */
	roleTooHigh: boolean;
}

export const verificationPatchSchema = z
	.object({
		enabled: z.boolean(),
		channelId: snowflake.nullable(),
		roleId: snowflake.nullable(),
		message: plainText(1, VERIFY_LIMITS.maxMessage),
		/** Posts the panel, or edits the one already there. Never implied by another field. */
		publish: z.literal(true),
	})
	.partial()
	.refine((patch) => Object.keys(patch).length > 0, "must change something");

export type VerificationPatch = z.infer<typeof verificationPatchSchema>;

/** Both have to be chosen before the panel is worth posting, and the page says which one is missing. */
export function verificationBlocked(config: { channelId: string | null; roleId: string | null }): string | null {
	const missing = [
		config.channelId === null ? "a channel" : null,
		config.roleId === null ? "a role to grant" : null,
	].filter((part): part is string => part !== null);

	return missing.length === 0 ? null : `Choose ${missing.join(" and ")} before posting the panel.`;
}
