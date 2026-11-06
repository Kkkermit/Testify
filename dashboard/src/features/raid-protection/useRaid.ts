import { useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { type RaidOverview, type RaidPatch } from "@testify/shared";
import { useOptimisticMutation } from "@/hooks/useOptimisticMutation";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

function applyPatch(current: RaidOverview, patch: RaidPatch): RaidOverview {
	const next = { ...current };
	for (const [key, value] of Object.entries(patch)) {
		if (value !== undefined) Object.assign(next, { [key]: value });
	}
	return next;
}

export function useRaid(guildId: string): UseQueryResult<RaidOverview> {
	return useQuery({
		queryKey: keys.guild(guildId).raid(),
		queryFn: () => api.get<RaidOverview>(`/guilds/${guildId}/raid-protection`),
	});
}

export function useUpdateRaid(guildId: string): UseMutationResult<RaidOverview, Error, RaidPatch> {
	return useOptimisticMutation(
		keys.guild(guildId).raid(),
		(patch: RaidPatch) => api.patch<RaidOverview>(`/guilds/${guildId}/raid-protection`, patch),
		applyPatch,
		[keys.guild(guildId).overview()],
	);
}
