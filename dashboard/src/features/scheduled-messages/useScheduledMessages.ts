import { useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { type ScheduledMessageInput, type ScheduledMessageList } from "@testify/shared";
import { useDocumentMutation } from "@/hooks/useDocumentMutation";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useScheduledMessages(guildId: string): UseQueryResult<ScheduledMessageList> {
	return useQuery({
		queryKey: keys.guild(guildId).scheduledMessages(),
		queryFn: () => api.get<ScheduledMessageList>(`/guilds/${guildId}/scheduled-messages`),
	});
}

export function useAddScheduledMessage(
	guildId: string,
): UseMutationResult<ScheduledMessageList, Error, ScheduledMessageInput> {
	return useListMutation(guildId, (body) =>
		api.post<ScheduledMessageList>(`/guilds/${guildId}/scheduled-messages`, body),
	);
}

export function useEditScheduledMessage(
	guildId: string,
): UseMutationResult<ScheduledMessageList, Error, ScheduledMessageInput & { id: string }> {
	return useListMutation(guildId, ({ id, ...body }) =>
		api.put<ScheduledMessageList>(`/guilds/${guildId}/scheduled-messages/${id}`, body),
	);
}

export function useRemoveScheduledMessage(
	guildId: string,
): UseMutationResult<ScheduledMessageList, Error, { id: string }> {
	return useListMutation(guildId, ({ id }) =>
		api.delete<ScheduledMessageList>(`/guilds/${guildId}/scheduled-messages/${id}`),
	);
}

function useListMutation<Body>(
	guildId: string,
	send: (body: Body) => Promise<ScheduledMessageList>,
): UseMutationResult<ScheduledMessageList, Error, Body> {
	return useDocumentMutation(keys.guild(guildId).scheduledMessages(), send, [keys.guild(guildId).overview()]);
}
