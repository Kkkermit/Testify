import { type QueryKey, useMutation, type UseMutationResult, useQueryClient } from "@tanstack/react-query";

interface Snapshot<Data> {
	previous: Data | undefined;
	/** False when another write was already on its way, so `previous` holds that write's optimistic value. */
	trusted: boolean;
}

/** A write shown at once from what was sent, put back if it is refused, and replaced by the server's answer. */
export function useOptimisticMutation<Data, Input>(
	key: QueryKey,
	send: (input: Input) => Promise<Data>,
	optimistic: (current: Data, input: Input) => Data,
	alsoStale: readonly QueryKey[] = [],
): UseMutationResult<Data, Error, Input, Snapshot<Data>> {
	const client = useQueryClient();
	const alone = (): boolean => client.isMutating({ mutationKey: key }) === 1;

	return useMutation({
		mutationKey: key,
		mutationFn: send,
		onMutate: async (input) => {
			const trusted = alone();
			// Or an in-flight read lands after the optimistic write and undoes it.
			await client.cancelQueries({ queryKey: key });
			const previous = client.getQueryData<Data>(key);

			if (previous !== undefined) client.setQueryData(key, optimistic(previous, input));

			return { previous, trusted };
		},
		onError: (_error, _input, snapshot) => {
			if (alone() && snapshot?.trusted === true && snapshot.previous !== undefined) {
				client.setQueryData(key, snapshot.previous);
			}
		},
		onSuccess: (data) => {
			if (alone()) client.setQueryData(key, data);
		},
		onSettled: (_data, error) => {
			if (!alone()) return;
			// A refusal at the end of overlapping writes cannot know what is stored, so a read decides.
			const stale = error === null ? alsoStale : [key, ...alsoStale];
			for (const queryKey of stale) void client.invalidateQueries({ queryKey });
		},
	});
}
