import { useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { type MusicPatch, type MusicSettings } from "@testify/shared";
import { useDocumentMutation } from "@/hooks/useDocumentMutation";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useMusic(guildId: string): UseQueryResult<MusicSettings> {
	return useQuery({
		queryKey: keys.guild(guildId).music(),
		queryFn: () => api.get<MusicSettings>(`/guilds/${guildId}/music`),
	});
}

export function useSaveMusic(guildId: string): UseMutationResult<MusicSettings, Error, MusicPatch> {
	return useDocumentMutation(
		keys.guild(guildId).music(),
		(body: MusicPatch) => api.patch<MusicSettings>(`/guilds/${guildId}/music`, body),
		[keys.guild(guildId).overview()],
	);
}
