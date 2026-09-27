import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type AuditLogConfigResponse, type AuditLogPut } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useAuditLog(guildId: string): UseQueryResult<AuditLogConfigResponse> {
	return useQuery({
		queryKey: keys.guild(guildId).auditLog(),
		queryFn: () => api.get<AuditLogConfigResponse>(`/guilds/${guildId}/audit-log`),
	});
}

/** Not optimistic, unlike the toggles elsewhere: this screen holds a draft until Save, so a refusal leaves it on screen to correct. */
export function useSaveAuditLog(guildId: string): UseMutationResult<AuditLogConfigResponse, Error, AuditLogPut> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: (next: AuditLogPut) => api.put<AuditLogConfigResponse>(`/guilds/${guildId}/audit-log`, next),
		onSuccess: (config) => {
			client.setQueryData(keys.guild(guildId).auditLog(), config);
		},
		onSettled: () => {
			void client.invalidateQueries({ queryKey: keys.guild(guildId).overview() });
		},
	});
}
