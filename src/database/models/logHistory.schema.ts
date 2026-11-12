import { model, Schema } from "mongoose";

/** The bot's own log lines, kept for its last few runs so the owner console can read back past a restart. */

export interface LogRunRecord {
	run: string;
	startedAt: Date;
	endedAt: Date | null;
	lastAt: Date | null;
	version: string;
}

export interface LogLineRecord {
	run: string;
	seq: number;
	at: Date;
	level: string;
	/** The level as a number, so "warn and above" is one range query. */
	rank: number;
	message: string;
	/** Stored as the JSON the console reads, since a context's keys are whatever a call site chose. */
	context: string;
}

const runSchema = new Schema<LogRunRecord>(
	{
		run: { type: String, required: true, unique: true },
		startedAt: { type: Date, required: true },
		endedAt: { type: Date, default: null },
		lastAt: { type: Date, default: null },
		version: { type: String, required: true },
	},
	{ versionKey: false },
);

runSchema.index({ startedAt: -1 });

const lineSchema = new Schema<LogLineRecord>(
	{
		run: { type: String, required: true },
		seq: { type: Number, required: true },
		at: { type: Date, required: true },
		level: { type: String, required: true },
		rank: { type: Number, required: true },
		message: { type: String, default: "" },
		context: { type: String, default: "{}" },
	},
	{ versionKey: false },
);

lineSchema.index({ run: 1, seq: -1 }, { unique: true });
lineSchema.index({ run: 1, rank: 1, seq: -1 });

export const LogRuns = model<LogRunRecord>("logrun", runSchema);
export const LogLines = model<LogLineRecord>("logline", lineSchema);
