import { MutationObserver } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import { keys } from "@/lib/queries";
import { createQueryClient } from "@/lib/queryClient";
import { me } from "@/test/fixtures/session";

const refusal = (code: string): ApiError => new ApiError(403, { error: { code, message: "No." } });

describe("the query client", () => {
	/** Blocked mid-session, the next request is refused, and only asking `/auth/me` again shows the reader why. */
	it("asks who the reader is again when a query or a write is refused as blacklisted, and not for other refusals", async () => {
		const client = createQueryClient();
		client.setQueryData(keys.me(), me);

		await client
			.fetchQuery({ queryKey: ["other"], queryFn: () => Promise.reject(refusal("missing_manage_guild")) })
			.catch(() => undefined);
		expect(client.getQueryState(keys.me())?.isInvalidated).toBe(false);

		await client
			.fetchQuery({ queryKey: ["blocked"], queryFn: () => Promise.reject(refusal("blacklisted")) })
			.catch(() => undefined);
		expect(client.getQueryState(keys.me())?.isInvalidated).toBe(true);

		client.setQueryData(keys.me(), me);
		await new MutationObserver(client, { mutationFn: () => Promise.reject(refusal("blacklisted")) })
			.mutate()
			.catch(() => undefined);
		expect(client.getQueryState(keys.me())?.isInvalidated).toBe(true);
	});
});
