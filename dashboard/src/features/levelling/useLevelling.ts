import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
	type ChannelSummary,
	type Ignores,
	type LevelConfigResponse,
	type LevellingPatch,
	type LevelRewardInput,
	type RoleSummary,
	type XpBoostInput,
} from "@testify/shared";
import { useOptimisticMutation } from "@/hooks/useOptimisticMutation";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useLevelling(guildId: string): UseQueryResult<LevelConfigResponse> {
	return useQuery({
		queryKey: keys.guild(guildId).levelling(),
		queryFn: () => api.get<LevelConfigResponse>(`/guilds/${guildId}/levelling`),
		staleTime: 30_000,
	});
}

export function useChannels(guildId: string | null): UseQueryResult<ChannelSummary[]> {
	return useQuery({
		queryKey: keys.guild(guildId ?? "").channels(),
		queryFn: () => api.get<ChannelSummary[]>(`/guilds/${guildId ?? ""}/channels`),
		enabled: guildId !== null,
		staleTime: 5 * 60_000,
	});
}

export function useRoles(guildId: string): UseQueryResult<RoleSummary[]> {
	return useQuery({
		queryKey: keys.guild(guildId).roles(),
		queryFn: () => api.get<RoleSummary[]>(`/guilds/${guildId}/roles`),
		staleTime: 5 * 60_000,
	});
}

function useLevellingMutation<TInput>(
	guildId: string,
	send: (input: TInput) => Promise<LevelConfigResponse>,
	optimistic: (current: LevelConfigResponse, input: TInput) => LevelConfigResponse,
) {
	return useOptimisticMutation(keys.guild(guildId).levelling(), send, optimistic, [keys.guild(guildId).overview()]);
}

export function useUpdateLevelling(guildId: string) {
	return useLevellingMutation<LevellingPatch>(
		guildId,
		(patch) => api.patch<LevelConfigResponse>(`/guilds/${guildId}/levelling`, patch),
		// Written out rather than spread: `levelUpChannelId` can legitimately be null, and `??` would read that as "leave it alone".
		(current, patch) => ({
			...current,
			enabled: patch.enabled ?? current.enabled,
			announce: patch.announce ?? current.announce,
			stackRewards: patch.stackRewards ?? current.stackRewards,
			levelUpChannelId: patch.levelUpChannelId === undefined ? current.levelUpChannelId : patch.levelUpChannelId,
		}),
	);
}

export function useUpdateBoosts(guildId: string) {
	return useLevellingMutation<XpBoostInput[]>(
		guildId,
		(boosts) => api.put<LevelConfigResponse>(`/guilds/${guildId}/levelling/boosts`, boosts),
		(current, boosts) => ({ ...current, boosts }),
	);
}

export function useUpdateRewards(guildId: string) {
	return useLevellingMutation<LevelRewardInput[]>(
		guildId,
		(rewards) => api.put<LevelConfigResponse>(`/guilds/${guildId}/levelling/rewards`, rewards),
		(current, rewards) => ({ ...current, rewards: [...rewards].sort((a, b) => a.level - b.level) }),
	);
}

export function useUpdateIgnores(guildId: string) {
	return useLevellingMutation<Ignores>(
		guildId,
		(ignores) => api.put<LevelConfigResponse>(`/guilds/${guildId}/levelling/ignores`, ignores),
		(current, ignores) => ({ ...current, ignoredChannelIds: ignores.channelIds, ignoredRoleIds: ignores.roleIds }),
	);
}
