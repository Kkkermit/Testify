import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { placementOf } from "@/features/channels/placement";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export interface PlaceRequest {
	feature: string;
	channelId: string;
}

/** Starts or moves a feature in a channel, then refreshes everything the server's screens read. */
export function usePlace(guildId: string): UseMutationResult<unknown, Error, PlaceRequest> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: async ({ feature, channelId }) => {
			const placement = placementOf(feature);
			if (placement === undefined) throw new Error(`${feature} cannot be placed from here`);
			const path = `/guilds/${guildId}${placement.path}`;
			return placement.method === "put"
				? api.put(path, placement.body(channelId))
				: api.patch(path, placement.body(channelId));
		},
		onSettled: () => {
			void client.invalidateQueries({ queryKey: keys.guild(guildId).all() });
		},
	});
}
