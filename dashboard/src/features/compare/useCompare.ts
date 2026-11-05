import { useQueries, type UseQueryResult } from "@tanstack/react-query";
import { type ChannelSummary, type GuildOverview } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useOverviews(guildIds: readonly string[]): UseQueryResult<GuildOverview>[] {
	return useQueries({
		queries: guildIds.map((guildId) => ({
			queryKey: keys.guild(guildId).overview(),
			queryFn: () => api.get<GuildOverview>(`/guilds/${guildId}/overview`),
			staleTime: 30_000,
		})),
	});
}

export function useChannelLists(guildIds: readonly string[]): UseQueryResult<ChannelSummary[]>[] {
	return useQueries({
		queries: guildIds.map((guildId) => ({
			queryKey: keys.guild(guildId).channels(),
			queryFn: () => api.get<ChannelSummary[]>(`/guilds/${guildId}/channels`),
			staleTime: 5 * 60_000,
		})),
	});
}
