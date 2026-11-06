import { useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { type TempVoicePatch, type TempVoiceSettings } from "@testify/shared";
import { useDocumentMutation } from "@/hooks/useDocumentMutation";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useTempVoice(guildId: string): UseQueryResult<TempVoiceSettings> {
	return useQuery({
		queryKey: keys.guild(guildId).tempVoice(),
		queryFn: () => api.get<TempVoiceSettings>(`/guilds/${guildId}/temp-voice`),
	});
}

function useTempVoiceWrite<Body>(
	guildId: string,
	send: (body: Body) => Promise<TempVoiceSettings>,
): UseMutationResult<TempVoiceSettings, Error, Body> {
	return useDocumentMutation(keys.guild(guildId).tempVoice(), send, [
		keys.guild(guildId).overview(),
		keys.guild(guildId).channels(),
	]);
}

export function useSaveTempVoice(guildId: string): UseMutationResult<TempVoiceSettings, Error, TempVoicePatch> {
	return useTempVoiceWrite(guildId, (patch: TempVoicePatch) =>
		api.patch<TempVoiceSettings>(`/guilds/${guildId}/temp-voice`, patch),
	);
}

export function useMakeLobby(guildId: string): UseMutationResult<TempVoiceSettings, Error, undefined> {
	return useTempVoiceWrite(guildId, () => api.post<TempVoiceSettings>(`/guilds/${guildId}/temp-voice/lobby`));
}
