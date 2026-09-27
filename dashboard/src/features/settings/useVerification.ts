import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type VerificationConfigResponse, type VerificationPatch } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useVerification(guildId: string): UseQueryResult<VerificationConfigResponse> {
	return useQuery({
		queryKey: keys.guild(guildId).verification(),
		queryFn: () => api.get<VerificationConfigResponse>(`/guilds/${guildId}/verification`),
	});
}

/** Not optimistic: a write here can post a message into a public channel, so nothing may move before the server agrees. */
export function useSaveVerification(
	guildId: string,
): UseMutationResult<VerificationConfigResponse, Error, VerificationPatch> {
	const client = useQueryClient();
	const key = keys.guild(guildId).verification();

	return useMutation({
		mutationKey: key,
		mutationFn: (patch: VerificationPatch) =>
			api.patch<VerificationConfigResponse>(`/guilds/${guildId}/verification`, patch),
		onSuccess: (config) => {
			if (client.isMutating({ mutationKey: key }) === 1) client.setQueryData(key, config);
		},
		onSettled: () => {
			if (client.isMutating({ mutationKey: key }) > 1) return;
			void client.invalidateQueries({ queryKey: key });
			void client.invalidateQueries({ queryKey: keys.guild(guildId).overview() });
		},
	});
}
