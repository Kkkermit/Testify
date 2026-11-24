import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useOptimisticMutation } from "@/hooks/useOptimisticMutation";

const KEY = ["guild", "welcome"];

function refusal(): { promise: Promise<string>; refuse: () => void } {
	let refuse: () => void = () => undefined;
	const promise = new Promise<string>((_resolve, reject) => {
		refuse = () => {
			reject(new Error("refused"));
		};
	});
	return { promise, refuse };
}

/** Two writes refused together put back the second's snapshot, which was the first's optimistic value, as if stored. */
it("never puts back a snapshot taken while another write was on its way", async () => {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	client.setQueryData(KEY, "stored");
	const first = refusal();
	const second = refusal();
	const answers = [first, second];

	const { result } = renderHook(
		() => {
			useQuery({ queryKey: KEY, queryFn: () => Promise.resolve("stored") });
			return useOptimisticMutation(
				KEY,
				() => answers.shift()!.promise,
				(_current, input: string) => input,
			);
		},
		{ wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> },
	);

	await act(async () => {
		result.current.mutate("typed");
		result.current.mutate("typed");
		await Promise.resolve();
	});

	await act(async () => {
		first.refuse();
		await first.promise.catch(() => undefined);
	});
	await act(async () => {
		second.refuse();
		await second.promise.catch(() => undefined);
	});

	await waitFor(() => {
		expect(client.getQueryData(KEY)).toBe("stored");
	});
});
