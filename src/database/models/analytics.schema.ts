import { model, Schema } from "mongoose";

/**
 * One row per command per server per day per surface, incremented in place.
 *
 * A row per invocation would be the obvious shape and would grow without bound on a busy bot; this answers
 * every question the owner console asks with one aggregation over a few thousand documents.
 *
 * No user IDs are stored. "Which commands are used" is the question; "who used them" is not, and a
 * self-hoster's analytics should not quietly become a per-person activity log.
 */
export interface CommandUsage {
	/** `YYYY-MM-DD`, UTC — a string so a day is one exact-match key rather than a range scan. */
	day: string;
	/** `DIRECT_MESSAGE` when the command was not run in a server. */
	guildId: string;
	command: string;
	surface: "slash" | "prefix";
	count: number;
	/** How many of those ended in an error the user was apologised to for. */
	failures: number;
	expiresAt: Date;
	createdAt: Date;
	updatedAt: Date;
}

const usageSchema = new Schema<CommandUsage>(
	{
		day: { type: String, required: true },
		guildId: { type: String, required: true },
		command: { type: String, required: true },
		surface: { type: String, required: true, enum: ["slash", "prefix"] },
		count: { type: Number, required: true, default: 0 },
		failures: { type: Number, required: true, default: 0 },
		expiresAt: { type: Date, required: true },
	},
	{ timestamps: true },
);

usageSchema.index({ day: 1, guildId: 1, command: 1, surface: 1 }, { unique: true });
usageSchema.index({ day: -1 });
usageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const CommandUsages = model<CommandUsage>("commandusage", usageSchema);
