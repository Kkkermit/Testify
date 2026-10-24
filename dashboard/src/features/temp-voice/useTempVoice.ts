import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type TempVoicePatch, type TempVoiceSettings } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useTempVoice(guildId: string): UseQueryResult<TempVoiceSettings> {
	return useQuery({
		queryKey: keys.guild(guildId).tempVoice(),
		queryFn: () => api.get<TempVoiceSettings>(`/guilds/${guildId}/temp-voice`),
	});
}

/** Both answer with the whole document, so they share one key and only the last write in flight is trusted. */
function useTempVoiceWrite<Body>(
	guildId: string,
	send: (body: Body) => Promise<TempVoiceSettings>,
): UseMutationResult<TempVoiceSettings, Error, Body> {
	const client = useQueryClient();
	const key = keys.guild(guildId).tempVoice();

	return useMutation({
		mutationKey: key,
		mutationFn: send,
		onSuccess: (settings) => {
			if (client.isMutating({ mutationKey: key }) === 1) client.setQueryData(key, settings);
		},
		onSettled: () => {
			if (client.isMutating({ mutationKey: key }) !== 1) return;
			void client.invalidateQueries({ queryKey: key });
			void client.invalidateQueries({ queryKey: keys.guild(guildId).overview() });
			void client.invalidateQueries({ queryKey: keys.guild(guildId).channels() });
		},
	});
}

export function useSaveTempVoice(guildId: string): UseMutationResult<TempVoiceSettings, Error, TempVoicePatch> {
	return useTempVoiceWrite(guildId, (patch: TempVoicePatch) =>
		api.patch<TempVoiceSettings>(`/guilds/${guildId}/temp-voice`, patch),
	);
}

export function useMakeLobby(guildId: string): UseMutationResult<TempVoiceSettings, Error, undefined> {
	return useTempVoiceWrite(guildId, () => api.post<TempVoiceSettings>(`/guilds/${guildId}/temp-voice/lobby`));
}
