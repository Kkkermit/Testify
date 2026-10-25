import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type GoodbyePatch, type GoodbyeSettings } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

/** A spread would let an absent field overwrite a present one with `undefined`. */
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

/** Optimistic, with the previous value kept so a refusal puts it back. */
export function useUpdateGoodbye(guildId: string): UseMutationResult<GoodbyeSettings, Error, GoodbyePatch> {
	const client = useQueryClient();
	const key = keys.guild(guildId).goodbye();

	return useMutation({
		mutationFn: (patch: GoodbyePatch) => api.patch<GoodbyeSettings>(`/guilds/${guildId}/goodbye`, patch),
		onMutate: async (patch) => {
			await client.cancelQueries({ queryKey: key });
			const previous = client.getQueryData<GoodbyeSettings>(key);

			if (previous !== undefined) client.setQueryData<GoodbyeSettings>(key, applyPatch(previous, patch));

			return { previous };
		},
		onError: (_error, _patch, context) => {
			if (context?.previous !== undefined) client.setQueryData(key, context.previous);
		},
		onSuccess: (settings) => {
			client.setQueryData(key, settings);
		},
		onSettled: () => {
			void client.invalidateQueries({ queryKey: keys.guild(guildId).overview() });
		},
	});
}
