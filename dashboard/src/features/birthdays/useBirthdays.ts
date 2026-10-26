import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type BirthdayOverview, type BirthdayPatch } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

/** A spread would let an absent field overwrite a present one with `undefined`. */
function applyPatch(current: BirthdayOverview, patch: BirthdayPatch): BirthdayOverview {
	return {
		...current,
		...(patch.enabled === undefined ? {} : { enabled: patch.enabled }),
		...(patch.channelId === undefined ? {} : { channelId: patch.channelId }),
		...(patch.message === undefined ? {} : { message: patch.message }),
	};
}

export function useBirthdays(guildId: string): UseQueryResult<BirthdayOverview> {
	return useQuery({
		queryKey: keys.guild(guildId).birthdays(),
		queryFn: () => api.get<BirthdayOverview>(`/guilds/${guildId}/birthdays`),
	});
}

/** Optimistic, with the previous value kept so a refusal puts it back. */
export function useUpdateBirthdays(guildId: string): UseMutationResult<BirthdayOverview, Error, BirthdayPatch> {
	const client = useQueryClient();
	const key = keys.guild(guildId).birthdays();

	return useMutation({
		mutationFn: (patch: BirthdayPatch) => api.patch<BirthdayOverview>(`/guilds/${guildId}/birthdays`, patch),
		onMutate: async (patch) => {
			await client.cancelQueries({ queryKey: key });
			const previous = client.getQueryData<BirthdayOverview>(key);

			if (previous !== undefined) client.setQueryData<BirthdayOverview>(key, applyPatch(previous, patch));

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
