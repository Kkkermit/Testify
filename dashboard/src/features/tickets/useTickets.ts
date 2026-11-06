import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type OpenTicketList, type TicketPatch, type TicketSettings } from "@testify/shared";
import { useDocumentMutation } from "@/hooks/useDocumentMutation";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useTickets(guildId: string): UseQueryResult<TicketSettings> {
	return useQuery({
		queryKey: keys.guild(guildId).tickets(),
		queryFn: () => api.get<TicketSettings>(`/guilds/${guildId}/tickets`),
	});
}

export function useSaveTickets(guildId: string): UseMutationResult<TicketSettings, Error, TicketPatch> {
	return useTicketMutation(guildId, (body) => api.patch<TicketSettings>(`/guilds/${guildId}/tickets`, body));
}

export function useDisableTickets(guildId: string): UseMutationResult<TicketSettings, Error, void> {
	return useTicketMutation(guildId, () => api.delete<TicketSettings>(`/guilds/${guildId}/tickets`));
}

function useTicketMutation<Body>(
	guildId: string,
	send: (body: Body) => Promise<TicketSettings>,
): UseMutationResult<TicketSettings, Error, Body> {
	return useDocumentMutation(keys.guild(guildId).tickets(), send, [keys.guild(guildId).overview()]);
}

export function useOpenTickets(guildId: string, enabled: boolean): UseQueryResult<OpenTicketList> {
	return useQuery({
		queryKey: keys.guild(guildId).openTickets(),
		queryFn: () => api.get<OpenTicketList>(`/guilds/${guildId}/tickets/open`),
		enabled,
	});
}

export function useCloseTicket(guildId: string): UseMutationResult<OpenTicketList, Error, string> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: (channelId: string) => api.post<OpenTicketList>(`/guilds/${guildId}/tickets/open/${channelId}/close`),
		onSuccess: (list) => {
			client.setQueryData(keys.guild(guildId).openTickets(), list);
		},
		onSettled: () => {
			void client.invalidateQueries({ queryKey: keys.guild(guildId).tickets() });
		},
	});
}
