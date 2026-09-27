import { model, Schema } from "mongoose";
import { STATUS_LEVELS, type StatusLevel } from "@testify/shared";

/** One heartbeat every few minutes, so a stretch with none is how the status page knows the bot was off. */
export interface StatusSample {
	at: Date;
	level: StatusLevel;
	gatewayPingMs: number | null;
	databasePingMs: number | null;
	eventLoopP99Ms: number | null;
	expiresAt: Date;
}

const statusSampleSchema = new Schema<StatusSample>({
	at: { type: Date, required: true },
	level: { type: String, enum: STATUS_LEVELS, required: true },
	gatewayPingMs: { type: Number, default: null },
	databasePingMs: { type: Number, default: null },
	eventLoopP99Ms: { type: Number, default: null },
	expiresAt: { type: Date, required: true },
});

statusSampleSchema.index({ at: 1 });
statusSampleSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const StatusSamples = model<StatusSample>("statussample", statusSampleSchema);
