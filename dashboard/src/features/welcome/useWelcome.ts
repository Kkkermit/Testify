import { useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { type WelcomeConfigResponse, type WelcomePatch } from "@testify/shared";
import { useOptimisticMutation } from "@/hooks/useOptimisticMutation";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

function applyPatch(current: WelcomeConfigResponse, patch: WelcomePatch): WelcomeConfigResponse {
	return {
		...current,
		...(patch.enabled === undefined ? {} : { enabled: patch.enabled }),
		...(patch.channelId === undefined ? {} : { channelId: patch.channelId }),
		...(patch.message === undefined ? {} : { message: patch.message }),
		...(patch.style === undefined ? {} : { style: patch.style }),
	};
}

export function useWelcome(guildId: string): UseQueryResult<WelcomeConfigResponse> {
	return useQuery({
		queryKey: keys.guild(guildId).welcome(),
		queryFn: () => api.get<WelcomeConfigResponse>(`/guilds/${guildId}/welcome`),
	});
}

export function useUpdateWelcome(guildId: string): UseMutationResult<WelcomeConfigResponse, Error, WelcomePatch> {
	return useOptimisticMutation(
		keys.guild(guildId).welcome(),
		(patch: WelcomePatch) => api.patch<WelcomeConfigResponse>(`/guilds/${guildId}/welcome`, patch),
		applyPatch,
		[keys.guild(guildId).overview()],
	);
}
