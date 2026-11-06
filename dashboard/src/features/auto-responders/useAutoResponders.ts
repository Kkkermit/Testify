import { useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { type AutoResponderInput, type AutoResponderList } from "@testify/shared";
import { useDocumentMutation } from "@/hooks/useDocumentMutation";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useAutoResponders(guildId: string): UseQueryResult<AutoResponderList> {
	return useQuery({
		queryKey: keys.guild(guildId).autoResponders(),
		queryFn: () => api.get<AutoResponderList>(`/guilds/${guildId}/auto-responders`),
	});
}

export function useAddAutoResponder(guildId: string): UseMutationResult<AutoResponderList, Error, AutoResponderInput> {
	return useListMutation(guildId, (body) => api.post<AutoResponderList>(`/guilds/${guildId}/auto-responders`, body));
}

export function useEditAutoResponder(
	guildId: string,
): UseMutationResult<AutoResponderList, Error, AutoResponderInput & { id: string }> {
	return useListMutation(guildId, ({ id, ...body }) =>
		api.put<AutoResponderList>(`/guilds/${guildId}/auto-responders/${id}`, body),
	);
}

export function useRemoveAutoResponder(guildId: string): UseMutationResult<AutoResponderList, Error, { id: string }> {
	return useListMutation(guildId, ({ id }) =>
		api.delete<AutoResponderList>(`/guilds/${guildId}/auto-responders/${id}`),
	);
}

function useListMutation<Body>(
	guildId: string,
	send: (body: Body) => Promise<AutoResponderList>,
): UseMutationResult<AutoResponderList, Error, Body> {
	return useDocumentMutation(keys.guild(guildId).autoResponders(), send, [keys.guild(guildId).overview()]);
}
