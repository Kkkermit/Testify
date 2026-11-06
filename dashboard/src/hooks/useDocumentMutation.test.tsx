import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { useDocumentMutation } from "@/hooks/useDocumentMutation";

const KEY = ["guild", "settings"];

function deferred(): { promise: Promise<string>; resolve: (value: string) => void } {
	let resolve: (value: string) => void = () => undefined;
	const promise = new Promise<string>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

/** An answer that lands while a later write is still out carries a snapshot from before it, and would undo it. */
it("leaves the cache alone until the last write in flight answers, then asks again", async () => {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	client.setQueryData(KEY, "stored");
	const invalidate = jest.spyOn(client, "invalidateQueries");
	const first = deferred();
	const second = deferred();
	const answers = [first, second];

	const { result } = renderHook(() => useDocumentMutation(KEY, () => answers.shift()!.promise, [["overview"]]), {
		wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
	});

	act(() => {
		result.current.mutate(undefined);
		result.current.mutate(undefined);
	});

	await act(async () => {
		first.resolve("first");
		await first.promise;
	});
	expect(client.getQueryData(KEY)).toBe("stored");
	expect(invalidate).not.toHaveBeenCalled();

	await act(async () => {
		second.resolve("second");
		await second.promise;
	});
	expect(client.getQueryData(KEY)).toBe("second");
	expect(invalidate).toHaveBeenCalledWith({ queryKey: KEY });
	expect(invalidate).toHaveBeenCalledWith({ queryKey: ["overview"] });
});
