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
	type MusicSourceChoice,
	type MusicSourceSetting,
	type Notice,
	type NoticeInput,
	type NoticePatch,
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

export function useMusicSources(): UseQueryResult<MusicSourceSetting> {
	return useQuery({
		queryKey: keys.owner.musicSources(),
		queryFn: () => api.get<MusicSourceSetting>("/control/music"),
	});
}

export function useSetMusicSources(): UseMutationResult<MusicSourceSetting, Error, MusicSourceChoice> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: (sources: MusicSourceChoice) => api.put<MusicSourceSetting>("/control/music", { sources }),
		onSuccess: (setting) => {
			client.setQueryData(keys.owner.musicSources(), setting);
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

/** The fleet table and the stats are refetched, because their counts are the bot's to report. */
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

export function useOwnerNotices(): UseQueryResult<Notice[]> {
	return useQuery({ queryKey: keys.owner.notices(), queryFn: () => api.get<Notice[]>("/owner/notices") });
}

/** Every change to a notification is also a change to what everybody's feed says, the owner's own included. */
function useNoticeWrite<Variables, Result>(
	write: (variables: Variables) => Promise<Result>,
): UseMutationResult<Result, Error, Variables> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: write,
		onSettled: async () => {
			await Promise.all([
				client.invalidateQueries({ queryKey: keys.owner.notices() }),
				client.invalidateQueries({ queryKey: keys.notices() }),
			]);
		},
	});
}

export function usePostNotice(): UseMutationResult<Notice, Error, NoticeInput> {
	return useNoticeWrite((input: NoticeInput) => api.post<Notice>("/owner/notices", input));
}

export function useChangeNotice(): UseMutationResult<Notice, Error, { id: string; patch: NoticePatch }> {
	return useNoticeWrite(({ id, patch }: { id: string; patch: NoticePatch }) =>
		api.patch<Notice>(`/owner/notices/${id}`, patch),
	);
}

export function useRemoveNotice(): UseMutationResult<null, Error, string> {
	return useNoticeWrite((id: string) => api.delete<null>(`/owner/notices/${id}`));
}
