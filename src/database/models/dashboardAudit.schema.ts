import { model, Schema } from "mongoose";

export interface DashboardAudit {
	actorId: string;
	actorTag: string;
	/** Null for an owner-console action, which is not about one guild. */
	guildId: string | null;
	action: string;
	summary: string;
	before?: unknown;
	after?: unknown;
	at: Date;
}

const auditSchema = new Schema<DashboardAudit>({
	actorId: { type: String, required: true },
	actorTag: { type: String, required: true },
	guildId: { type: String, default: null },
	action: { type: String, required: true },
	summary: { type: String, required: true },
	before: { type: Schema.Types.Mixed, default: undefined },
	after: { type: Schema.Types.Mixed, default: undefined },
	at: { type: Date, required: true, default: Date.now },
});

auditSchema.index({ guildId: 1, at: -1 });
// Ninety days, so a busy bot cannot grow this collection without bound.
auditSchema.index({ at: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const DashboardAudits = model<DashboardAudit>("dashboardaudit", auditSchema);
