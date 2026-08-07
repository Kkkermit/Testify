import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type LotteryPatch, type LotterySettings } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useLottery(guildId: string): UseQueryResult<LotterySettings> {
	return useQuery({
		queryKey: keys.guild(guildId).lottery(),
		queryFn: () => api.get<LotterySettings>(`/guilds/${guildId}/lottery`),
	});
}

export function useSaveLottery(guildId: string): UseMutationResult<LotterySettings, Error, LotteryPatch> {
	return useLotteryMutation(guildId, (body) => api.patch<LotterySettings>(`/guilds/${guildId}/lottery`, body));
}

export function useEndLottery(guildId: string): UseMutationResult<LotterySettings, Error, void> {
	return useLotteryMutation(guildId, () => api.delete<LotterySettings>(`/guilds/${guildId}/lottery`));
}

function useLotteryMutation<Body>(
	guildId: string,
	send: (body: Body) => Promise<LotterySettings>,
): UseMutationResult<LotterySettings, Error, Body> {
	const client = useQueryClient();
	const key = keys.guild(guildId).lottery();

	return useMutation({
		mutationKey: key,
		mutationFn: send,
		onSuccess: (settings) => {
			// A whole-document answer is only trusted while it is the only write in flight.
			if (client.isMutating({ mutationKey: key }) === 1) client.setQueryData(key, settings);
		},
		onSettled: () => {
			if (client.isMutating({ mutationKey: key }) !== 1) return;
			void client.invalidateQueries({ queryKey: key });
			void client.invalidateQueries({ queryKey: keys.guild(guildId).overview() });
		},
	});
}
