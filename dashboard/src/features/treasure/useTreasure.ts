import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type TreasurePatch, type TreasureSettings } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useTreasure(guildId: string): UseQueryResult<TreasureSettings> {
	return useQuery({
		queryKey: keys.guild(guildId).treasure(),
		queryFn: () => api.get<TreasureSettings>(`/guilds/${guildId}/treasure`),
	});
}

export function useSaveTreasure(guildId: string): UseMutationResult<TreasureSettings, Error, TreasurePatch> {
	return useTreasureMutation(guildId, (body) => api.patch<TreasureSettings>(`/guilds/${guildId}/treasure`, body));
}

export function useResetTreasure(guildId: string): UseMutationResult<TreasureSettings, Error, void> {
	return useTreasureMutation(guildId, () => api.post<TreasureSettings>(`/guilds/${guildId}/treasure/reset`, {}));
}

function useTreasureMutation<Body>(
	guildId: string,
	send: (body: Body) => Promise<TreasureSettings>,
): UseMutationResult<TreasureSettings, Error, Body> {
	const client = useQueryClient();
	const key = keys.guild(guildId).treasure();

	return useMutation({
		mutationKey: key,
		mutationFn: send,
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
