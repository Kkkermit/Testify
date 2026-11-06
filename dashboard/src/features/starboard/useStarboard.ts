import { useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { type StarboardPatch, type StarboardSettings } from "@testify/shared";
import { useDocumentMutation } from "@/hooks/useDocumentMutation";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useStarboard(guildId: string): UseQueryResult<StarboardSettings> {
	return useQuery({
		queryKey: keys.guild(guildId).starboard(),
		queryFn: () => api.get<StarboardSettings>(`/guilds/${guildId}/starboard`),
	});
}

export function useSaveStarboard(guildId: string): UseMutationResult<StarboardSettings, Error, StarboardPatch> {
	return useDocumentMutation(
		keys.guild(guildId).starboard(),
		(patch) => api.patch<StarboardSettings>(`/guilds/${guildId}/starboard`, patch),
		[keys.guild(guildId).overview()],
	);
}
