import { useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { type BirthdayOverview, type BirthdayPatch } from "@testify/shared";
import { useOptimisticMutation } from "@/hooks/useOptimisticMutation";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

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

export function useUpdateBirthdays(guildId: string): UseMutationResult<BirthdayOverview, Error, BirthdayPatch> {
	return useOptimisticMutation(
		keys.guild(guildId).birthdays(),
		(patch: BirthdayPatch) => api.patch<BirthdayOverview>(`/guilds/${guildId}/birthdays`, patch),
		applyPatch,
		[keys.guild(guildId).overview()],
	);
}
