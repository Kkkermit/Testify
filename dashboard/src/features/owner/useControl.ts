import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import {
	type BotControlState,
	type BotIdentity,
	type BotIdentityPatch,
	type GatewayAction,
	type OwnerGuildDetail,
} from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useBotControl(): UseQueryResult<BotControlState> {
	return useQuery({
		queryKey: keys.owner.control(),
		queryFn: () => api.get<BotControlState>("/control"),
		refetchInterval: 15_000,
	});
}

export function useGateway(): UseMutationResult<BotControlState, Error, GatewayAction> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: (body: GatewayAction) => api.post<BotControlState>("/control/gateway", body),
		onSuccess: (state) => {
			client.setQueryData(keys.owner.control(), state);
		},
	});
}

export function useShutdown(): UseMutationResult<{ stopping: boolean }, Error, void> {
	return useMutation({
		mutationFn: () => api.post<{ stopping: boolean }>("/control/shutdown", { confirm: "shut down" }),
	});
}

export function useBotIdentity(): UseMutationResult<BotIdentity, Error, BotIdentityPatch> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: (patch: BotIdentityPatch) => api.patch<BotIdentity>("/control/identity", patch),
		onSuccess: () => {
			// Every brand surface reads this, so the whole shell has to re-render with the new name.
			void client.invalidateQueries({ queryKey: keys.bot() });
		},
	});
}

/**
 * The server is gone from every list once this succeeds, so the fleet table and the stats above it are both
 * refetched rather than patched — the counts they show are the bot's, not this card's to recompute.
 */
export function useLeaveGuild(guildId: string): UseMutationResult<{ left: string }, Error, string> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: (confirm: string) => api.post<{ left: string }>(`/control/guilds/${guildId}/leave`, { confirm }),
		onSuccess: async () => {
			await Promise.all([
				client.invalidateQueries({ queryKey: ["owner", "guilds"] }),
				client.invalidateQueries({ queryKey: keys.owner.stats() }),
			]);
		},
	});
}

export function useGuildDetail(guildId: string | null): UseQueryResult<OwnerGuildDetail> {
	return useQuery({
		queryKey: keys.owner.guildDetail(guildId ?? ""),
		queryFn: () => api.get<OwnerGuildDetail>(`/control/guilds/${guildId ?? ""}`),
		enabled: guildId !== null,
	});
}
