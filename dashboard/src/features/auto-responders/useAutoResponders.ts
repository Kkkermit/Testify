import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type AutoResponderInput, type AutoResponderList } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useAutoResponders(guildId: string): UseQueryResult<AutoResponderList> {
	return useQuery({
		queryKey: keys.guild(guildId).autoResponders(),
		queryFn: () => api.get<AutoResponderList>(`/guilds/${guildId}/auto-responders`),
	});
}

/** Not optimistic: every write answers with the whole list, which is what the page then shows. */
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
	const client = useQueryClient();
	const key = keys.guild(guildId).autoResponders();

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
