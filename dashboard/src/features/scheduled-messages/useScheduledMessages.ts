import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type ScheduledMessageInput, type ScheduledMessageList } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useScheduledMessages(guildId: string): UseQueryResult<ScheduledMessageList> {
	return useQuery({
		queryKey: keys.guild(guildId).scheduledMessages(),
		queryFn: () => api.get<ScheduledMessageList>(`/guilds/${guildId}/scheduled-messages`),
	});
}

/** Not optimistic: every write answers with the whole list, which is what the page then shows. */
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
	const client = useQueryClient();
	const key = keys.guild(guildId).scheduledMessages();

	return useMutation({
		mutationKey: key,
		mutationFn: send,
		onSuccess: (list) => {
			// A whole-list answer is only trusted while it is the only write in flight.
			if (client.isMutating({ mutationKey: key }) === 1) client.setQueryData(key, list);
		},
		onSettled: () => {
			if (client.isMutating({ mutationKey: key }) !== 1) return;
			void client.invalidateQueries({ queryKey: key });
			void client.invalidateQueries({ queryKey: keys.guild(guildId).overview() });
		},
	});
}
