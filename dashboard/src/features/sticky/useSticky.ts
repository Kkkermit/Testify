import { useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { type StickyList, type StickyPut } from "@testify/shared";
import { useDocumentMutation } from "@/hooks/useDocumentMutation";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useSticky(guildId: string): UseQueryResult<StickyList> {
	return useQuery({
		queryKey: keys.guild(guildId).sticky(),
		queryFn: () => api.get<StickyList>(`/guilds/${guildId}/sticky`),
	});
}

export function useSaveSticky(guildId: string): UseMutationResult<StickyList, Error, StickyPut> {
	return useListMutation(guildId, (body) => api.put<StickyList>(`/guilds/${guildId}/sticky`, body));
}

export function useRemoveSticky(guildId: string): UseMutationResult<StickyList, Error, { channelId: string }> {
	return useListMutation(guildId, ({ channelId }) => api.delete<StickyList>(`/guilds/${guildId}/sticky/${channelId}`));
}

function useListMutation<Body>(
	guildId: string,
	send: (body: Body) => Promise<StickyList>,
): UseMutationResult<StickyList, Error, Body> {
	return useDocumentMutation(keys.guild(guildId).sticky(), send, [keys.guild(guildId).overview()]);
}
