import { type StatusSample, StatusSamples } from "@database/models/statusSample.schema";
import { STATUS_LIMITS } from "@testify/shared";

export type SampleInput = Omit<StatusSample, "expiresAt">;

const RETENTION_MS = STATUS_LIMITS.historyDays * 86_400_000;

export async function recordStatusSample(sample: SampleInput): Promise<void> {
	await StatusSamples.create({ ...sample, expiresAt: new Date(sample.at.getTime() + RETENTION_MS) });
}

export async function statusSamplesSince(since: Date): Promise<SampleInput[]> {
	return StatusSamples.find({ at: { $gte: since } }, { _id: 0, expiresAt: 0, __v: 0 })
		.sort({ at: 1 })
		.lean<SampleInput[]>()
		.exec();
}

export async function firstStatusSampleAt(): Promise<Date | null> {
	const first = await StatusSamples.findOne({}, { at: 1 }).sort({ at: 1 }).lean<{ at: Date }>().exec();

	return first?.at ?? null;
}
