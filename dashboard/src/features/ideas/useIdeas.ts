import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import {
	type IdeaDecision,
	type IdeaFilter,
	type IdeaRow,
	type IdeaSettings,
	type IdeaSettingsPatch,
	type Paged,
} from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useIdeaSettings(guildId: string): UseQueryResult<IdeaSettings> {
	return useQuery({
		queryKey: keys.guild(guildId).ideaSettings(),
		queryFn: () => api.get<IdeaSettings>(`/guilds/${guildId}/ideas`),
	});
}

export function useIdeaList(guildId: string, status: IdeaFilter, page: number): UseQueryResult<Paged<IdeaRow>> {
	return useQuery({
		queryKey: keys.guild(guildId).ideaList(status, page),
		queryFn: () => api.get<Paged<IdeaRow>>(`/guilds/${guildId}/ideas/list?status=${status}&page=${String(page)}`),
		placeholderData: keepPreviousData,
	});
}

/** Not optimistic: turning the board on can be refused for a channel the bot cannot post in. */
export function useSaveIdeaSettings(guildId: string): UseMutationResult<IdeaSettings, Error, IdeaSettingsPatch> {
	const client = useQueryClient();
	const key = keys.guild(guildId).ideaSettings();

	return useMutation({
		mutationKey: key,
		mutationFn: (patch) => api.patch<IdeaSettings>(`/guilds/${guildId}/ideas`, patch),
		onSuccess: (settings) => {
			if (client.isMutating({ mutationKey: key }) === 1) client.setQueryData(key, settings);
		},
		onSettled: () => {
			if (client.isMutating({ mutationKey: key }) !== 1) return;
			void client.invalidateQueries({ queryKey: keys.guild(guildId).overview() });
		},
	});
}

/** Both change the counts as well as the list, so everything under the board is read again. */
export function useDecideIdea(
	guildId: string,
): UseMutationResult<IdeaRow, Error, { ideaId: string; decision: IdeaDecision }> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: ({ ideaId, decision }) => api.post<IdeaRow>(`/guilds/${guildId}/ideas/${ideaId}/decision`, decision),
		onSettled: () => client.invalidateQueries({ queryKey: keys.guild(guildId).allIdeas() }),
	});
}

export function useRemoveIdea(guildId: string): UseMutationResult<undefined, Error, { ideaId: string }> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: ({ ideaId }) => api.delete<undefined>(`/guilds/${guildId}/ideas/${ideaId}`),
		onSettled: () => client.invalidateQueries({ queryKey: keys.guild(guildId).allIdeas() }),
	});
}
