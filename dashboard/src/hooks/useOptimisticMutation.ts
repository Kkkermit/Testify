import { type QueryKey, useMutation, type UseMutationResult, useQueryClient } from "@tanstack/react-query";

/** A write shown at once from what was sent, put back if it is refused, and replaced by the server's answer. */
export function useOptimisticMutation<Data, Input>(
	key: QueryKey,
	send: (input: Input) => Promise<Data>,
	optimistic: (current: Data, input: Input) => Data,
	alsoStale: readonly QueryKey[] = [],
): UseMutationResult<Data, Error, Input, { previous: Data | undefined }> {
	const client = useQueryClient();

	return useMutation({
		mutationFn: send,
		onMutate: async (input) => {
			// Or an in-flight read lands after the optimistic write and undoes it.
			await client.cancelQueries({ queryKey: key });
			const previous = client.getQueryData<Data>(key);

			if (previous !== undefined) client.setQueryData(key, optimistic(previous, input));

			return { previous };
		},
		onError: (_error, _input, context) => {
			if (context?.previous !== undefined) client.setQueryData(key, context.previous);
		},
		onSuccess: (data) => {
			client.setQueryData(key, data);
		},
		onSettled: () => {
			for (const queryKey of alsoStale) void client.invalidateQueries({ queryKey });
		},
	});
}
