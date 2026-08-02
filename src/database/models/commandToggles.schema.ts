import { model, Schema } from "mongoose";

/**
 * Which commands are switched off, and where.
 *
 * One row per scope: a server's row is keyed by its own id, and the bot-wide row uses the `GLOBAL` sentinel.
 * A Discord id is always 17-20 digits, so the sentinel can never collide with a real guild.
 */
export interface CommandToggles {
	guildId: string;
	/** Command names that are off. Absent from this list means on, so a new command ships enabled. */
	disabled: string[];
	/** Who last changed it, for the audit trail the dashboard writes alongside. */
	updatedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const toggleSchema = new Schema<CommandToggles>(
	{
		guildId: { type: String, required: true, unique: true },
		disabled: { type: [String], required: true, default: [] },
		updatedBy: { type: String, default: null },
	},
	{ timestamps: true },
);

export const CommandToggleConfig = model<CommandToggles>("commandtoggles", toggleSchema);
