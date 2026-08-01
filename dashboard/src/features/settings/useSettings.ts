import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type ServerSettings } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useSettings(guildId: string): UseQueryResult<ServerSettings> {
	return useQuery({
		queryKey: keys.guild(guildId).settings(),
		queryFn: () => api.get<ServerSettings>(`/guilds/${guildId}/settings`),
	});
}

/**
 * One hook per section, because each section is its own endpoint. Every write answers with the whole settings
 * document, so the cache is replaced rather than merged — a section that refuses cannot leave the rest of the
 * screen showing a value the bot does not have.
 */
export function useSaveSection<Patch>(
	guildId: string,
	section: string,
	method: "patch" | "put" = "patch",
): UseMutationResult<ServerSettings, Error, Patch> {
	const client = useQueryClient();
	const key = keys.guild(guildId).settings();

	return useMutation({
		mutationFn: (patch: Patch) => api[method]<ServerSettings>(`/guilds/${guildId}/settings/${section}`, patch),
		onSuccess: (settings) => {
			client.setQueryData(key, settings);
		},
		onSettled: () => {
			// The overview's feature grid and its audit list both change with this.
			void client.invalidateQueries({ queryKey: keys.guild(guildId).overview() });
		},
	});
}
