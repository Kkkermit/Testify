import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type GiveawayList, type GiveawayStart } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useGiveaways(guildId: string): UseQueryResult<GiveawayList> {
	return useQuery({
		queryKey: keys.guild(guildId).giveaways(),
		queryFn: () => api.get<GiveawayList>(`/guilds/${guildId}/giveaways`),
	});
}

/**
 * None of these are optimistic: every one posts to or edits a real Discord message, and a row that changed
 * before the server agreed would be claiming something happened in a channel that it did not.
 */
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
	const client = useQueryClient();
	const key = keys.guild(guildId).giveaways();

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
		},
	});
}
