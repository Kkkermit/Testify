import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type TicketPatch, type TicketSettings } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useTickets(guildId: string): UseQueryResult<TicketSettings> {
	return useQuery({
		queryKey: keys.guild(guildId).tickets(),
		queryFn: () => api.get<TicketSettings>(`/guilds/${guildId}/tickets`),
	});
}

/** Not optimistic: posting a panel is a message in a public channel, and a control that moved first would claim it had been sent. */
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
	const client = useQueryClient();
	const key = keys.guild(guildId).tickets();

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
