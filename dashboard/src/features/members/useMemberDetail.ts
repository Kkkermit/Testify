import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type BanBody, type KickBody, type LevelBody, type MemberDetail, type MoneyBody } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useMemberDetail(guildId: string, userId: string): UseQueryResult<MemberDetail> {
	return useQuery({
		queryKey: keys.guild(guildId).member(userId),
		queryFn: () => api.get<MemberDetail>(`/guilds/${guildId}/members/${userId}`),
	});
}

export function useKick(guildId: string, userId: string): UseMutationResult<MemberDetail, Error, KickBody> {
	return useMemberMutation(guildId, userId, (body: KickBody) =>
		api.post<MemberDetail>(`/guilds/${guildId}/members/${userId}/kick`, body),
	);
}

export function useBan(guildId: string, userId: string): UseMutationResult<MemberDetail, Error, BanBody> {
	return useMemberMutation(guildId, userId, (body: BanBody) =>
		api.post<MemberDetail>(`/guilds/${guildId}/members/${userId}/ban`, body),
	);
}

export function useSetLevel(guildId: string, userId: string): UseMutationResult<MemberDetail, Error, LevelBody> {
	return useMemberMutation(guildId, userId, (body: LevelBody) =>
		api.patch<MemberDetail>(`/guilds/${guildId}/members/${userId}/level`, body),
	);
}

export function useChangeMoney(guildId: string, userId: string): UseMutationResult<MemberDetail, Error, MoneyBody> {
	return useMemberMutation(guildId, userId, (body: MoneyBody) =>
		api.patch<MemberDetail>(`/guilds/${guildId}/members/${userId}/money`, body),
	);
}

export function useLiftSoftban(guildId: string, userId: string): UseMutationResult<MemberDetail, Error, void> {
	return useMemberMutation(guildId, userId, () =>
		api.delete<MemberDetail>(`/guilds/${guildId}/members/${userId}/softban`),
	);
}

function useMemberMutation<Body>(
	guildId: string,
	userId: string,
	send: (body: Body) => Promise<MemberDetail>,
): UseMutationResult<MemberDetail, Error, Body> {
	const client = useQueryClient();
	const key = keys.guild(guildId).member(userId);

	return useMutation({
		mutationKey: key,
		mutationFn: send,
		onSuccess: (detail) => {
			// A whole-document answer is only trusted while it is the only write in flight.
			if (client.isMutating({ mutationKey: key }) === 1) client.setQueryData(key, detail);
		},
		onSettled: () => {
			if (client.isMutating({ mutationKey: key }) !== 1) return;
			void client.invalidateQueries({ queryKey: key });
		},
	});
}
