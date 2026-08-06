import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type WelcomeConfigResponse, type WelcomePatch } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

/** A spread would let an absent field overwrite a present one with `undefined`. */
export function applyPatch(current: WelcomeConfigResponse, patch: WelcomePatch): WelcomeConfigResponse {
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

/** Optimistic, with the previous value kept so a refusal puts it back rather than leaving a lie on screen. */
export function useUpdateWelcome(guildId: string): UseMutationResult<WelcomeConfigResponse, Error, WelcomePatch> {
	const client = useQueryClient();
	const key = keys.guild(guildId).welcome();

	return useMutation({
		mutationFn: (patch: WelcomePatch) => api.patch<WelcomeConfigResponse>(`/guilds/${guildId}/welcome`, patch),
		onMutate: async (patch) => {
			await client.cancelQueries({ queryKey: key });
			const previous = client.getQueryData<WelcomeConfigResponse>(key);

			if (previous !== undefined) client.setQueryData<WelcomeConfigResponse>(key, applyPatch(previous, patch));

			return { previous };
		},
		onError: (_error, _patch, context) => {
			if (context?.previous !== undefined) client.setQueryData(key, context.previous);
		},
		onSuccess: (config) => {
			client.setQueryData(key, config);
		},
		onSettled: () => {
			void client.invalidateQueries({ queryKey: keys.guild(guildId).overview() });
		},
	});
}
