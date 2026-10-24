import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type StarboardPatch, type StarboardSettings } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useStarboard(guildId: string): UseQueryResult<StarboardSettings> {
	return useQuery({
		queryKey: keys.guild(guildId).starboard(),
		queryFn: () => api.get<StarboardSettings>(`/guilds/${guildId}/starboard`),
	});
}

/** Not optimistic: turning the board on can be refused for a channel the bot cannot post in. */
export function useSaveStarboard(guildId: string): UseMutationResult<StarboardSettings, Error, StarboardPatch> {
	const client = useQueryClient();
	const key = keys.guild(guildId).starboard();

	return useMutation({
		mutationKey: key,
		mutationFn: (patch) => api.patch<StarboardSettings>(`/guilds/${guildId}/starboard`, patch),
		onSuccess: (settings) => {
			if (client.isMutating({ mutationKey: key }) === 1) client.setQueryData(key, settings);
		},
		onSettled: () => {
			if (client.isMutating({ mutationKey: key }) !== 1) return;
			void client.invalidateQueries({ queryKey: key });
			void client.invalidateQueries({ queryKey: keys.guild(guildId).overview() });
		},
	});
}
