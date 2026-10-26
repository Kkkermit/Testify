import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import {
	type BanBody,
	type KickBody,
	type LevelBody,
	type MemberDetail,
	type MemberRoles,
	type MoneyBody,
	type NicknameBody,
	type TimeoutBody,
} from "@testify/shared";
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

export function useTimeout(guildId: string, userId: string): UseMutationResult<MemberDetail, Error, TimeoutBody> {
	return useMemberMutation(guildId, userId, (body: TimeoutBody) =>
		api.post<MemberDetail>(`/guilds/${guildId}/members/${userId}/timeout`, body),
	);
}

export function useLiftTimeout(guildId: string, userId: string): UseMutationResult<MemberDetail, Error, void> {
	return useMemberMutation(guildId, userId, () =>
		api.delete<MemberDetail>(`/guilds/${guildId}/members/${userId}/timeout`),
	);
}

export function useRename(guildId: string, userId: string): UseMutationResult<MemberDetail, Error, NicknameBody> {
	return useMemberMutation(guildId, userId, (body: NicknameBody) =>
		api.patch<MemberDetail>(`/guilds/${guildId}/members/${userId}/nickname`, body),
	);
}

export function useMemberRoles(guildId: string, userId: string, enabled: boolean): UseQueryResult<MemberRoles> {
	return useQuery({
		queryKey: keys.guild(guildId).memberRoles(userId),
		queryFn: () => api.get<MemberRoles>(`/guilds/${guildId}/members/${userId}/roles`),
		enabled,
	});
}

/** The page's role badges come from the member, so both are read again once the roles land. */
export function useSetMemberRoles(guildId: string, userId: string): UseMutationResult<MemberRoles, Error, string[]> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: (roleIds: string[]) => api.put<MemberRoles>(`/guilds/${guildId}/members/${userId}/roles`, { roleIds }),
		onSuccess: (roles) => {
			client.setQueryData(keys.guild(guildId).memberRoles(userId), roles);
		},
		onSettled: () => {
			void client.invalidateQueries({ queryKey: keys.guild(guildId).member(userId) });
		},
	});
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
