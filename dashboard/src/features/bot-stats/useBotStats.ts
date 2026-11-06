import { useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { type BotStatsPost, type BotStatsSettings } from "@testify/shared";
import { useDocumentMutation } from "@/hooks/useDocumentMutation";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useBotStats(guildId: string): UseQueryResult<BotStatsSettings> {
	return useQuery({
		queryKey: keys.guild(guildId).botStats(),
		queryFn: () => api.get<BotStatsSettings>(`/guilds/${guildId}/bot-stats`),
	});
}

export function usePostBotStats(guildId: string): UseMutationResult<BotStatsSettings, Error, BotStatsPost> {
	return useBotStatsMutation(guildId, (body) => api.put<BotStatsSettings>(`/guilds/${guildId}/bot-stats`, body));
}

export function useRemoveBotStats(guildId: string): UseMutationResult<BotStatsSettings, Error, void> {
	return useBotStatsMutation(guildId, () => api.delete<BotStatsSettings>(`/guilds/${guildId}/bot-stats`));
}

function useBotStatsMutation<Body>(
	guildId: string,
	send: (body: Body) => Promise<BotStatsSettings>,
): UseMutationResult<BotStatsSettings, Error, Body> {
	return useDocumentMutation(keys.guild(guildId).botStats(), send, [keys.guild(guildId).overview()]);
}
