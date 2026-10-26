import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type RaidOverview, type RaidPatch } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

/** A spread would let an absent field overwrite a present one with `undefined`. */
function applyPatch(current: RaidOverview, patch: RaidPatch): RaidOverview {
	const next = { ...current };
	for (const [key, value] of Object.entries(patch)) {
		if (value !== undefined) Object.assign(next, { [key]: value });
	}
	return next;
}

export function useRaid(guildId: string): UseQueryResult<RaidOverview> {
	return useQuery({
		queryKey: keys.guild(guildId).raid(),
		queryFn: () => api.get<RaidOverview>(`/guilds/${guildId}/raid-protection`),
	});
}

/** Optimistic, with the previous value kept so a refusal puts it back. */
export function useUpdateRaid(guildId: string): UseMutationResult<RaidOverview, Error, RaidPatch> {
	const client = useQueryClient();
	const key = keys.guild(guildId).raid();

	return useMutation({
		mutationFn: (patch: RaidPatch) => api.patch<RaidOverview>(`/guilds/${guildId}/raid-protection`, patch),
		onMutate: async (patch) => {
			await client.cancelQueries({ queryKey: key });
			const previous = client.getQueryData<RaidOverview>(key);

			if (previous !== undefined) client.setQueryData<RaidOverview>(key, applyPatch(previous, patch));

			return { previous };
		},
		onError: (_error, _patch, context) => {
			if (context?.previous !== undefined) client.setQueryData(key, context.previous);
		},
		onSuccess: (overview) => {
			client.setQueryData(key, overview);
		},
		onSettled: () => {
			void client.invalidateQueries({ queryKey: keys.guild(guildId).overview() });
		},
	});
}
