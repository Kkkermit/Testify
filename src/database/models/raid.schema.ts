import { model, Schema } from "mongoose";
import { DEFAULT_RAID, RAID_LIMITS } from "@testify/shared";

/** How a server holds back new accounts and where it hears about a spike in joins. Nothing about any member. */
export interface RaidSettingsRecord {
	guildId: string;
	enabled: boolean;
	alertChannelId: string | null;
	pingRoleId: string | null;
	minAccountAgeMinutes: number;
	/** How the age was kept before minutes; read once by `normaliseRaid` and unset on the record's next save. */
	minAccountAgeDays?: number;
	spikeJoins: number;
	spikeMinutes: number;
	updatedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const raidSettingsSchema = new Schema<RaidSettingsRecord>(
	{
		guildId: { type: String, required: true, unique: true },
		enabled: { type: Boolean, default: DEFAULT_RAID.enabled },
		alertChannelId: { type: String, default: null },
		pingRoleId: { type: String, default: null },
		minAccountAgeMinutes: {
			type: Number,
			default: DEFAULT_RAID.minAccountAgeMinutes,
			min: 0,
			max: RAID_LIMITS.maxAccountAgeMinutes,
		},
		// Declared so an update may unset it; strict mode drops an operator on a path the schema does not name.
		minAccountAgeDays: { type: Number },
		spikeJoins: { type: Number, default: DEFAULT_RAID.spikeJoins },
		spikeMinutes: { type: Number, default: DEFAULT_RAID.spikeMinutes },
		updatedBy: { type: String, default: null },
	},
	{ timestamps: true },
);

export const RaidSettingsConfig = model<RaidSettingsRecord>("raidsettings", raidSettingsSchema);
