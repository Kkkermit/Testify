import { useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { type LotteryPatch, type LotterySettings } from "@testify/shared";
import { useDocumentMutation } from "@/hooks/useDocumentMutation";
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
	return useDocumentMutation(keys.guild(guildId).lottery(), send, [keys.guild(guildId).overview()]);
}
