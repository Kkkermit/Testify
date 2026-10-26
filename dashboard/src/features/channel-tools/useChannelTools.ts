import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type ChannelToolList, type ChannelToolPatch, type ToolChannel } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useChannelTools(guildId: string): UseQueryResult<ChannelToolList> {
	return useQuery({
		queryKey: keys.guild(guildId).channelTools(),
		queryFn: () => api.get<ChannelToolList>(`/guilds/${guildId}/channel-tools`),
	});
}

function replaced(list: ChannelToolList, channel: ToolChannel): ChannelToolList {
	return { channels: list.channels.map((entry) => (entry.id === channel.id ? channel : entry)) };
}

/** One channel at a time and answered with that channel alone, so two quick changes cannot undo each other. */
export function useUpdateChannel(
	guildId: string,
): UseMutationResult<ToolChannel, Error, { channelId: string } & ChannelToolPatch> {
	const client = useQueryClient();
	const key = keys.guild(guildId).channelTools();

	return useMutation({
		mutationFn: ({ channelId, ...patch }) =>
			api.patch<ToolChannel>(`/guilds/${guildId}/channel-tools/${channelId}`, patch),
		onMutate: async ({ channelId, locked, slowmodeSeconds }) => {
			await client.cancelQueries({ queryKey: key });
			const previous = client.getQueryData<ChannelToolList>(key);
			const current = previous?.channels.find((entry) => entry.id === channelId);

			if (previous !== undefined && current !== undefined) {
				client.setQueryData<ChannelToolList>(
					key,
					replaced(previous, {
						...current,
						...(locked === undefined ? {} : { locked }),
						...(slowmodeSeconds === undefined ? {} : { slowmodeSeconds }),
					}),
				);
			}
			return { previous };
		},
		onError: (_error, _patch, context) => {
			if (context?.previous !== undefined) client.setQueryData(key, context.previous);
		},
		onSuccess: (channel) => {
			const list = client.getQueryData<ChannelToolList>(key);
			if (list !== undefined) client.setQueryData(key, replaced(list, channel));
		},
	});
}
