import { useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { type VerificationConfigResponse, type VerificationPatch } from "@testify/shared";
import { useDocumentMutation } from "@/hooks/useDocumentMutation";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useVerification(guildId: string): UseQueryResult<VerificationConfigResponse> {
	return useQuery({
		queryKey: keys.guild(guildId).verification(),
		queryFn: () => api.get<VerificationConfigResponse>(`/guilds/${guildId}/verification`),
	});
}

export function useSaveVerification(
	guildId: string,
): UseMutationResult<VerificationConfigResponse, Error, VerificationPatch> {
	return useDocumentMutation(
		keys.guild(guildId).verification(),
		(patch: VerificationPatch) => api.patch<VerificationConfigResponse>(`/guilds/${guildId}/verification`, patch),
		[keys.guild(guildId).overview()],
	);
}
