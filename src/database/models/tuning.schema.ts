import { model, Schema } from "mongoose";
import { DEFAULT_TUNING } from "@testify/shared";

/** How one server's pay, starting money, robbing and XP differ from the bot's own numbers. */
export interface TuningRecord {
	guildId: string;
	payRate: number;
	startingWallet: number;
	robbing: boolean;
	xpRate: number;
	xpCooldownSeconds: number;
	updatedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const tuningSchema = new Schema<TuningRecord>(
	{
		guildId: { type: String, required: true, unique: true },
		payRate: { type: Number, default: DEFAULT_TUNING.payRate },
		startingWallet: { type: Number, default: DEFAULT_TUNING.startingWallet },
		robbing: { type: Boolean, default: DEFAULT_TUNING.robbing },
		xpRate: { type: Number, default: DEFAULT_TUNING.xpRate },
		xpCooldownSeconds: { type: Number, default: DEFAULT_TUNING.xpCooldownSeconds },
		updatedBy: { type: String, default: null },
	},
	{ timestamps: true },
);

export const TuningConfig = model<TuningRecord>("servertuning", tuningSchema);
