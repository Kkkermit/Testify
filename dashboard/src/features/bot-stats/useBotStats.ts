import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type BotStatsPost, type BotStatsSettings } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useBotStats(guildId: string): UseQueryResult<BotStatsSettings> {
	return useQuery({
		queryKey: keys.guild(guildId).botStats(),
		queryFn: () => api.get<BotStatsSettings>(`/guilds/${guildId}/bot-stats`),
	});
}

/** Not optimistic: posting is a message in a public channel, and a control that moved first would claim it was sent. */
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
	const client = useQueryClient();
	const key = keys.guild(guildId).botStats();

	return useMutation({
		mutationKey: key,
		mutationFn: send,
		onSuccess: (settings) => {
			// A whole-document answer is only trusted while it is the only write in flight.
			if (client.isMutating({ mutationKey: key }) === 1) client.setQueryData(key, settings);
		},
		onSettled: () => {
			if (client.isMutating({ mutationKey: key }) !== 1) return;
			void client.invalidateQueries({ queryKey: key });
			void client.invalidateQueries({ queryKey: keys.guild(guildId).overview() });
		},
	});
}
