import { model, Schema } from "mongoose";
import { AUTO_RESPONDER_MATCHES, type AutoResponderMatch } from "@testify/shared";

/** One trigger and the reply a server's managers wrote for it. */
export interface AutoResponderRecord {
	guildId: string;
	trigger: string;
	/** The trigger as `triggerKey` reads it, so two spellings of the same words cannot both be stored. */
	key: string;
	match: AutoResponderMatch;
	reply: string;
	updatedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const autoResponderSchema = new Schema<AutoResponderRecord>(
	{
		guildId: { type: String, required: true },
		trigger: { type: String, required: true },
		key: { type: String, required: true },
		match: { type: String, enum: AUTO_RESPONDER_MATCHES, default: "word" },
		reply: { type: String, required: true },
		updatedBy: { type: String, default: null },
	},
	{ timestamps: true },
);

autoResponderSchema.index({ guildId: 1, key: 1 }, { unique: true });

export const AutoResponderEntry = model<AutoResponderRecord>("autoresponders", autoResponderSchema);
