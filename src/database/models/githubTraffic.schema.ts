import { model, Schema } from "mongoose";

/** The repository's daily views and clones as GitHub counted them, kept past the 14 days GitHub itself holds. */
export interface GitHubTrafficDayRecord {
	/** `YYYY-MM-DD`, UTC. */
	day: string;
	views: number;
	uniqueViews: number;
	clones: number;
	uniqueClones: number;
	expiresAt: Date;
}

const githubTrafficSchema = new Schema<GitHubTrafficDayRecord>({
	day: { type: String, required: true, unique: true },
	views: { type: Number, required: true, default: 0 },
	uniqueViews: { type: Number, required: true, default: 0 },
	clones: { type: Number, required: true, default: 0 },
	uniqueClones: { type: Number, required: true, default: 0 },
	expiresAt: { type: Date, required: true },
});

githubTrafficSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const GitHubTrafficDay = model<GitHubTrafficDayRecord>("githubtraffic", githubTrafficSchema);
