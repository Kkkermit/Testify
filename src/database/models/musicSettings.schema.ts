import { model, Schema } from "mongoose";

/** One row per server: whether the music system runs there, and which roles may drive it. */
export interface MusicSettingsRecord {
	guildId: string;
	enabled: boolean;
	/** Empty means anybody may use the player. */
	djRoleIds: string[];
	/** Who last changed it, for the audit trail the dashboard writes alongside. */
	updatedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const musicSettingsSchema = new Schema<MusicSettingsRecord>(
	{
		guildId: { type: String, required: true, unique: true },
		enabled: { type: Boolean, required: true, default: true },
		djRoleIds: { type: [String], required: true, default: [] },
		updatedBy: { type: String, default: null },
	},
	{ timestamps: true },
);

export const MusicSettingsConfig = model<MusicSettingsRecord>("musicsettings", musicSettingsSchema);
