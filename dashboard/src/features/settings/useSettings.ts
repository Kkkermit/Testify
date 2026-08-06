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

/** One mutation key across the sections: a whole-document answer is only trusted while it is the only write in flight, and the refetch on settle decides otherwise. */
export function useSaveSection<Patch>(
	guildId: string,
	section: string,
	method: "patch" | "put" = "patch",
): UseMutationResult<ServerSettings, Error, Patch> {
	const client = useQueryClient();
	const key = keys.guild(guildId).settings();
	const alone = (): boolean => client.isMutating({ mutationKey: key }) === 1;

	return useMutation({
		mutationKey: key,
		mutationFn: (patch: Patch) => api[method]<ServerSettings>(`/guilds/${guildId}/settings/${section}`, patch),
		onSuccess: (settings) => {
			if (alone()) client.setQueryData(key, settings);
		},
		onSettled: () => {
			if (!alone()) return;
			void client.invalidateQueries({ queryKey: key });
			void client.invalidateQueries({ queryKey: keys.guild(guildId).overview() });
		},
	});
}
