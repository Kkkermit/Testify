import { type QueryKey, useMutation, type UseMutationResult, useQueryClient } from "@tanstack/react-query";

/** A write answered with the whole document, which is only trusted while it is the only write to that key in flight. */
export function useDocumentMutation<Data, Body>(
	key: QueryKey,
	send: (body: Body) => Promise<Data>,
	alsoStale: readonly QueryKey[] = [],
): UseMutationResult<Data, Error, Body> {
	const client = useQueryClient();
	const alone = (): boolean => client.isMutating({ mutationKey: key }) === 1;

	return useMutation({
		mutationKey: key,
		mutationFn: send,
		onSuccess: (data) => {
			if (alone()) client.setQueryData(key, data);
		},
		onSettled: () => {
			if (!alone()) return;
			for (const queryKey of [key, ...alsoStale]) void client.invalidateQueries({ queryKey });
		},
	});
}
