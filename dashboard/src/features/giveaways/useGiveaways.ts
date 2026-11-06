import { useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { type GiveawayList, type GiveawayStart } from "@testify/shared";
import { useDocumentMutation } from "@/hooks/useDocumentMutation";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useGiveaways(guildId: string): UseQueryResult<GiveawayList> {
	return useQuery({
		queryKey: keys.guild(guildId).giveaways(),
		queryFn: () => api.get<GiveawayList>(`/guilds/${guildId}/giveaways`),
	});
}

export function useStartGiveaway(guildId: string): UseMutationResult<GiveawayList, Error, GiveawayStart> {
	return useListMutation(guildId, (body) => api.post<GiveawayList>(`/guilds/${guildId}/giveaways`, body));
}

export function useEndGiveaway(guildId: string): UseMutationResult<GiveawayList, Error, string> {
	return useListMutation(guildId, (messageId) =>
		api.post<GiveawayList>(`/guilds/${guildId}/giveaways/${messageId}/end`, {}),
	);
}

export function useRerollGiveaway(guildId: string): UseMutationResult<GiveawayList, Error, string> {
	return useListMutation(guildId, (messageId) =>
		api.post<GiveawayList>(`/guilds/${guildId}/giveaways/${messageId}/reroll`, {}),
	);
}

export function useDeleteGiveaway(guildId: string): UseMutationResult<GiveawayList, Error, string> {
	return useListMutation(guildId, (messageId) => api.delete<GiveawayList>(`/guilds/${guildId}/giveaways/${messageId}`));
}

function useListMutation<Body>(
	guildId: string,
	send: (body: Body) => Promise<GiveawayList>,
): UseMutationResult<GiveawayList, Error, Body> {
	return useDocumentMutation(keys.guild(guildId).giveaways(), send);
}
