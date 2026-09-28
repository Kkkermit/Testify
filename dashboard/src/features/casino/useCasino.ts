import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type CasinoPatch, type CasinoSettings } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useCasino(guildId: string): UseQueryResult<CasinoSettings> {
	return useQuery({
		queryKey: keys.guild(guildId).casino(),
		queryFn: () => api.get<CasinoSettings>(`/guilds/${guildId}/casino`),
	});
}

export function useSaveCasino(guildId: string): UseMutationResult<CasinoSettings, Error, CasinoPatch> {
	const client = useQueryClient();
	const key = keys.guild(guildId).casino();

	return useMutation({
		mutationKey: key,
		mutationFn: (body: CasinoPatch) => api.patch<CasinoSettings>(`/guilds/${guildId}/casino`, body),
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
