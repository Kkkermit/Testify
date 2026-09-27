import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type MusicPatch, type MusicSettings } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useMusic(guildId: string): UseQueryResult<MusicSettings> {
	return useQuery({
		queryKey: keys.guild(guildId).music(),
		queryFn: () => api.get<MusicSettings>(`/guilds/${guildId}/music`),
	});
}

export function useSaveMusic(guildId: string): UseMutationResult<MusicSettings, Error, MusicPatch> {
	const client = useQueryClient();
	const key = keys.guild(guildId).music();

	return useMutation({
		mutationKey: key,
		mutationFn: (body: MusicPatch) => api.patch<MusicSettings>(`/guilds/${guildId}/music`, body),
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
