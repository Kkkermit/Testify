import { model, Schema } from "mongoose";

/** One row per command run, for the owner console's "who ran what"; never the options, and gone after a month. */
export interface CommandRunRecord {
	/** `DIRECT_MESSAGE` when the command was not run in a server. */
	guildId: string;
	channelId: string | null;
	userId: string;
	/** As it was when the command ran, since somebody who has left can no longer be looked up. */
	username: string;
	command: string;
	subcommand: string | null;
	surface: "slash" | "prefix";
	failed: boolean;
	durationMs: number;
	at: Date;
	expiresAt: Date;
}

const runSchema = new Schema<CommandRunRecord>({
	guildId: { type: String, required: true },
	channelId: { type: String, default: null },
	userId: { type: String, required: true },
	username: { type: String, required: true },
	command: { type: String, required: true },
	subcommand: { type: String, default: null },
	surface: { type: String, required: true, enum: ["slash", "prefix"] },
	failed: { type: Boolean, required: true, default: false },
	durationMs: { type: Number, required: true, default: 0 },
	at: { type: Date, required: true },
	expiresAt: { type: Date, required: true },
});

runSchema.index({ guildId: 1, at: -1 });
runSchema.index({ guildId: 1, userId: 1, at: -1 });
runSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const CommandRuns = model<CommandRunRecord>("commandrun", runSchema);
