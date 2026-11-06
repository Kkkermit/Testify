import { useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { type TreasurePatch, type TreasureSettings } from "@testify/shared";
import { useDocumentMutation } from "@/hooks/useDocumentMutation";
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
	return useDocumentMutation(keys.guild(guildId).treasure(), send, [keys.guild(guildId).overview()]);
}
