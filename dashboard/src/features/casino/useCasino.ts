import { useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { type CasinoPatch, type CasinoSettings } from "@testify/shared";
import { useDocumentMutation } from "@/hooks/useDocumentMutation";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useCasino(guildId: string): UseQueryResult<CasinoSettings> {
	return useQuery({
		queryKey: keys.guild(guildId).casino(),
		queryFn: () => api.get<CasinoSettings>(`/guilds/${guildId}/casino`),
	});
}

export function useSaveCasino(guildId: string): UseMutationResult<CasinoSettings, Error, CasinoPatch> {
	return useDocumentMutation(
		keys.guild(guildId).casino(),
		(body: CasinoPatch) => api.patch<CasinoSettings>(`/guilds/${guildId}/casino`, body),
		[keys.guild(guildId).overview()],
	);
}
