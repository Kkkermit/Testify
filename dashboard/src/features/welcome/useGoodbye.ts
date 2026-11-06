import { useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { type GoodbyePatch, type GoodbyeSettings } from "@testify/shared";
import { useOptimisticMutation } from "@/hooks/useOptimisticMutation";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

function applyPatch(current: GoodbyeSettings, patch: GoodbyePatch): GoodbyeSettings {
	return {
		...current,
		...(patch.enabled === undefined ? {} : { enabled: patch.enabled }),
		...(patch.channelId === undefined ? {} : { channelId: patch.channelId }),
		...(patch.message === undefined ? {} : { message: patch.message }),
		...(patch.style === undefined ? {} : { style: patch.style }),
	};
}

export function useGoodbye(guildId: string): UseQueryResult<GoodbyeSettings> {
	return useQuery({
		queryKey: keys.guild(guildId).goodbye(),
		queryFn: () => api.get<GoodbyeSettings>(`/guilds/${guildId}/goodbye`),
	});
}

export function useUpdateGoodbye(guildId: string): UseMutationResult<GoodbyeSettings, Error, GoodbyePatch> {
	return useOptimisticMutation(
		keys.guild(guildId).goodbye(),
		(patch: GoodbyePatch) => api.patch<GoodbyeSettings>(`/guilds/${guildId}/goodbye`, patch),
		applyPatch,
		[keys.guild(guildId).overview()],
	);
}
