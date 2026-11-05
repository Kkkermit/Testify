import { useQueries, type UseQueryResult } from "@tanstack/react-query";
import { type ChannelSummary, type GuildOverview } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

/** Each server's own overview, so `requireGuild` asks about every column as it would on that server's page. */
export function useOverviews(guildIds: readonly string[]): UseQueryResult<GuildOverview>[] {
	return useQueries({
		queries: guildIds.map((guildId) => ({
			queryKey: keys.guild(guildId).overview(),
			queryFn: () => api.get<GuildOverview>(`/guilds/${guildId}/overview`),
			staleTime: 30_000,
		})),
	});
}

/** Each server's channels, so a feature's channel is named as that server's reader sees it. */
export function useChannelLists(guildIds: readonly string[]): UseQueryResult<ChannelSummary[]>[] {
	return useQueries({
		queries: guildIds.map((guildId) => ({
			queryKey: keys.guild(guildId).channels(),
			queryFn: () => api.get<ChannelSummary[]>(`/guilds/${guildId}/channels`),
			staleTime: 5 * 60_000,
		})),
	});
}
