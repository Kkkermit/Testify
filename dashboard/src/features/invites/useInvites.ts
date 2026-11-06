import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type InviteOverview, type InviteSettings, type InviteSettingsPatch } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useInvites(guildId: string): UseQueryResult<InviteOverview> {
	return useQuery({
		queryKey: keys.guild(guildId).invites(),
		queryFn: () => api.get<InviteOverview>(`/guilds/${guildId}/invites`),
	});
}

/** The answer is the settings alone, so it is merged into the overview rather than replacing it. */
export function useSaveInvites(guildId: string): UseMutationResult<InviteSettings, Error, InviteSettingsPatch> {
	const client = useQueryClient();

	return useMutation({
		mutationKey: keys.guild(guildId).invites(),
		mutationFn: (patch) => api.patch<InviteSettings>(`/guilds/${guildId}/invites`, patch),
		onSettled: () =>
			Promise.all([
				client.invalidateQueries({ queryKey: keys.guild(guildId).invites() }),
				client.invalidateQueries({ queryKey: keys.guild(guildId).overview() }),
			]),
	});
}
