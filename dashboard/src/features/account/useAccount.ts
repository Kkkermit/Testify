import {
	keepPreviousData,
	useMutation,
	type UseMutationResult,
	useQuery,
	useQueryClient,
	type UseQueryResult,
} from "@tanstack/react-query";
import {
	type AccountHistory,
	type AccountReminder,
	type AccountSession,
	type EraseAccountRequest,
	type ReminderRoute,
} from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useEraseAccount(): UseMutationResult<void, Error, EraseAccountRequest> {
	return useMutation({ mutationFn: (body) => api.post<void>("/auth/erase", body) });
}

export function useAccountHistory(page: number, server: string): UseQueryResult<AccountHistory> {
	const query = new URLSearchParams({ page: String(page), ...(server === "" ? {} : { server }) });

	return useQuery({
		queryKey: keys.account.history(page, server),
		queryFn: () => api.get<AccountHistory>(`/account/history?${query.toString()}`),
		placeholderData: keepPreviousData,
	});
}

export function useAccountReminders(): UseQueryResult<AccountReminder[]> {
	return useQuery({
		queryKey: keys.account.reminders(),
		queryFn: () => api.get<AccountReminder[]>("/account/reminders"),
	});
}

export function useReminderRoute(): UseMutationResult<AccountReminder, Error, { id: string; deliver: ReminderRoute }> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: ({ id, deliver }) => api.put<AccountReminder>(`/account/reminders/${id}/deliver`, { deliver }),
		onSuccess: (changed) => {
			client.setQueryData<AccountReminder[]>(keys.account.reminders(), (list) =>
				list?.map((row) => (row.id === changed.id ? changed : row)),
			);
		},
	});
}

export function useCancelReminder(): UseMutationResult<void, Error, string> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: (id) => api.delete<void>(`/account/reminders/${id}`),
		onSettled: () => client.invalidateQueries({ queryKey: keys.account.reminders() }),
	});
}

export function useAccountSessions(): UseQueryResult<AccountSession[]> {
	return useQuery({ queryKey: keys.account.sessions(), queryFn: () => api.get<AccountSession[]>("/account/sessions") });
}

export function useEndSession(): UseMutationResult<void, Error, string> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: (id) => api.delete<void>(`/account/sessions/${id}`),
		onSettled: () => client.invalidateQueries({ queryKey: keys.account.sessions() }),
	});
}

export function useEndOtherSessions(): UseMutationResult<{ ended: number }, Error, void> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: () => api.post<{ ended: number }>("/account/sessions/others/end", {}),
		onSettled: () => client.invalidateQueries({ queryKey: keys.account.sessions() }),
	});
}
