import { useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { type ServerTuning, type TuningPatch } from "@testify/shared";
import { useDocumentMutation } from "@/hooks/useDocumentMutation";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useTuning(guildId: string): UseQueryResult<ServerTuning> {
	return useQuery({
		queryKey: keys.guild(guildId).tuning(),
		queryFn: () => api.get<ServerTuning>(`/guilds/${guildId}/tuning`),
	});
}

export function useSaveTuning(guildId: string): UseMutationResult<ServerTuning, Error, TuningPatch> {
	return useDocumentMutation(keys.guild(guildId).tuning(), (patch) =>
		api.patch<ServerTuning>(`/guilds/${guildId}/tuning`, patch),
	);
}
