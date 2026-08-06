import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type StickyList, type StickyPut } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useSticky(guildId: string): UseQueryResult<StickyList> {
	return useQuery({
		queryKey: keys.guild(guildId).sticky(),
		queryFn: () => api.get<StickyList>(`/guilds/${guildId}/sticky`),
	});
}

/**
 * Not optimistic: a sticky is a message the bot posts into a channel, and a row that appeared before the server
 * agreed would be claiming something is running that may not be. The answer is the whole list, so it replaces.
 */
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
	const client = useQueryClient();
	const key = keys.guild(guildId).sticky();

	return useMutation({
		mutationKey: key,
		mutationFn: send,
		onSuccess: (list) => {
			// The same guard the settings sections use: a whole-list answer is only trusted when it is alone.
			if (client.isMutating({ mutationKey: key }) === 1) client.setQueryData(key, list);
		},
		onSettled: () => {
			if (client.isMutating({ mutationKey: key }) !== 1) return;
			void client.invalidateQueries({ queryKey: key });
			void client.invalidateQueries({ queryKey: keys.guild(guildId).overview() });
		},
	});
}
