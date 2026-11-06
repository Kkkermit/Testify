import { useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { type ServerSettings } from "@testify/shared";
import { useDocumentMutation } from "@/hooks/useDocumentMutation";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useSettings(guildId: string): UseQueryResult<ServerSettings> {
	return useQuery({
		queryKey: keys.guild(guildId).settings(),
		queryFn: () => api.get<ServerSettings>(`/guilds/${guildId}/settings`),
	});
}

export function useSaveSection<Patch>(
	guildId: string,
	section: string,
	method: "patch" | "put" = "patch",
): UseMutationResult<ServerSettings, Error, Patch> {
	return useDocumentMutation(
		keys.guild(guildId).settings(),
		(patch: Patch) => api[method]<ServerSettings>(`/guilds/${guildId}/settings/${section}`, patch),
		[keys.guild(guildId).overview()],
	);
}
