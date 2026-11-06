import {
	useMutation,
	type UseMutationResult,
	useQuery,
	useQueryClient,
	type UseQueryResult,
} from "@tanstack/react-query";
import {
	type AccessActivity,
	type AccessArea,
	type AccessGrantInput,
	type AccessList,
	type AccessPerson,
} from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useAccessList(guildId: string): UseQueryResult<AccessList> {
	return useQuery({
		queryKey: keys.guild(guildId).access(),
		queryFn: () => api.get<AccessList>(`/guilds/${guildId}/access`),
	});
}

export function useAccessPerson(guildId: string, userId: string): UseQueryResult<AccessActivity> {
	return useQuery({
		queryKey: keys.guild(guildId).accessPerson(userId),
		queryFn: () => api.get<AccessActivity>(`/guilds/${guildId}/access/${userId}`),
	});
}

export function useGrantAccess(guildId: string): UseMutationResult<AccessPerson, Error, AccessGrantInput> {
	const client = useQueryClient();
	return useMutation({
		mutationFn: (input) => api.post<AccessPerson>(`/guilds/${guildId}/access`, input),
		onSettled: () => client.invalidateQueries({ queryKey: keys.guild(guildId).access() }),
	});
}

export function useChangeAccess(
	guildId: string,
	userId: string,
): UseMutationResult<AccessPerson, Error, readonly AccessArea[]> {
	const client = useQueryClient();
	return useMutation({
		mutationFn: (areas) => api.put<AccessPerson>(`/guilds/${guildId}/access/${userId}`, { areas }),
		onSettled: () => client.invalidateQueries({ queryKey: keys.guild(guildId).access() }),
	});
}

export function useRemoveAccess(guildId: string): UseMutationResult<unknown, Error, string> {
	const client = useQueryClient();
	return useMutation({
		mutationFn: (userId) => api.delete(`/guilds/${guildId}/access/${userId}`),
		onSettled: () => client.invalidateQueries({ queryKey: keys.guild(guildId).access() }),
	});
}
