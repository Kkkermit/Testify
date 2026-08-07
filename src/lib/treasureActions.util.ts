import { type TreasureConfigSettings } from "@database/models/guildSettings.schema";
import { getTreasureConfig, saveTreasureConfig } from "@database/repositories/settingsRepository";
import { TREASURE_DEFAULTS, type TreasurePatch, type TreasureSettings, treasureProblem } from "@testify/shared";

export { TREASURE_LIMITS, treasureProblem } from "@testify/shared";

/** Falls back to the defaults so an unconfigured guild still renders a full panel. */
export function normaliseTreasure(config: TreasureConfigSettings | null): TreasureSettings {
	return {
		enabled: config?.isEnabled ?? false,
		minMessages: config?.minMessages ?? TREASURE_DEFAULTS.minMessages,
		maxMessages: config?.maxMessages ?? TREASURE_DEFAULTS.maxMessages,
		minAmount: config?.minAmount ?? TREASURE_DEFAULTS.minAmount,
		maxAmount: config?.maxAmount ?? TREASURE_DEFAULTS.maxAmount,
		cooldownMs: config?.cooldownMs ?? TREASURE_DEFAULTS.cooldownMs,
		configured: config !== null,
	};
}

export async function readTreasure(guildId: string): Promise<TreasureSettings> {
	return normaliseTreasure(await getTreasureConfig(guildId));
}

/** Refuses the merged record, because a patch can carry one half of a min/max pair. */
export async function applyTreasure(
	guildId: string,
	patch: TreasurePatch,
	actorId: string,
): Promise<{ settings: TreasureSettings } | { problem: string }> {
	const current = await readTreasure(guildId);
	const next: TreasureSettings = {
		enabled: patch.enabled ?? current.enabled,
		minMessages: patch.minMessages ?? current.minMessages,
		maxMessages: patch.maxMessages ?? current.maxMessages,
		minAmount: patch.minAmount ?? current.minAmount,
		maxAmount: patch.maxAmount ?? current.maxAmount,
		cooldownMs: patch.cooldownMs ?? current.cooldownMs,
		configured: current.configured,
	};

	const problem = treasureProblem(next);
	if (problem !== null) return { problem };

	await saveTreasureConfig(guildId, {
		isEnabled: next.enabled,
		minMessages: next.minMessages,
		maxMessages: next.maxMessages,
		minAmount: next.minAmount,
		maxAmount: next.maxAmount,
		cooldownMs: next.cooldownMs,
		lastModifiedBy: actorId,
	});

	return { settings: { ...next, configured: true } };
}

/** Keeps the switch where it is, which is a separate decision from the numbers behind it. */
export async function resetTreasure(guildId: string, actorId: string): Promise<TreasureSettings> {
	const current = await readTreasure(guildId);

	await saveTreasureConfig(guildId, { ...TREASURE_DEFAULTS, isEnabled: current.enabled, lastModifiedBy: actorId });

	return { ...TREASURE_DEFAULTS, enabled: current.enabled, configured: true };
}
