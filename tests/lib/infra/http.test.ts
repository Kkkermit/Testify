import { z } from "zod";
import { ServiceError } from "@core/errors";
import { fetchJson, fetchRaw } from "@lib/infra/http.util";
import { resetServiceHealth, serviceChecks } from "@lib/infra/serviceHealth.util";

const ORIGINAL_FETCH = globalThis.fetch;

function stubFetch(implementation: (url: string, init: RequestInit) => unknown): jest.Mock {
	const mock = jest.fn((url: string, init: RequestInit) => Promise.resolve(implementation(url, init)));
	globalThis.fetch = mock as unknown as typeof fetch;
	return mock;
}

function response(body: unknown, init: { ok?: boolean; status?: number; json?: () => Promise<unknown> } = {}): unknown {
	return {
		ok: init.ok ?? true,
		status: init.status ?? 200,
		json: init.json ?? ((): Promise<unknown> => Promise.resolve(body)),
		text: (): Promise<string> => Promise.resolve(String(body)),
	};
}

afterEach(() => {
	globalThis.fetch = ORIGINAL_FETCH;
	resetServiceHealth();
});

describe("what the status page learns from each call", () => {
	/** A 404 for an article that does not exist is the service working, not the service down. */
	it("does not count a refusal of the request against the service", async () => {
		stubFetch(() => response("nope", { ok: false, status: 404 }));
		await expect(fetchRaw("svc", "https://example.test/a")).rejects.toBeInstanceOf(ServiceError);

		expect(serviceChecks()[0]).toMatchObject({ lastOk: true, failures: 0 });
	});

	it("counts a call that never connected against the service", async () => {
		globalThis.fetch = jest.fn(() => Promise.reject(new Error("ECONNRESET")));
		await expect(fetchRaw("svc", "https://example.test/a")).rejects.toBeInstanceOf(ServiceError);

		expect(serviceChecks()[0]).toMatchObject({ lastOk: false, failures: 1 });
	});
});

describe("fetchRaw", () => {
	it("leaves undefined query parameters off entirely", async () => {
		const mock = stubFetch(() => response("ok"));
		await fetchRaw("svc", "https://example.test/a", { query: { kept: "yes", skipped: undefined } });

		const url = new URL(String(mock.mock.calls[0]?.[0]));
		expect(url.searchParams.has("skipped")).toBe(false);
		expect(url.searchParams.get("kept")).toBe("yes");
	});

	/** The timer stopped once the headers arrived, so a body that stalled halfway held the command for ever. */
	it("keeps the timeout running while the body is read", async () => {
		const mock = stubFetch(() => response("ok"));
		await fetchRaw("svc", "https://example.test/a", { timeoutMs: 10 });
		const signal = (mock.mock.calls[0]?.[1] as RequestInit).signal;

		await new Promise((resolve) => setTimeout(resolve, 40));
		expect(signal?.aborted).toBe(true);
	});

	it("wraps a network failure rather than letting it escape raw", async () => {
		stubFetch(() => {
			throw new Error("ECONNREFUSED");
		});

		await expect(fetchRaw("svc", "https://example.test/a")).rejects.toBeInstanceOf(ServiceError);
	});
});

describe("fetchJson", () => {
	const schema = z.object({ name: z.string() });

	it("rejects a body that does not match, rather than passing bad data on", async () => {
		stubFetch(() => response({ nome: "typo" }));

		const error = await fetchJson("svc", "https://example.test/a", schema).catch((problem: unknown) => problem);

		// The detail lives on `cause`, so a schema mismatch never reaches chat.
		expect(error).toBeInstanceOf(ServiceError);
		expect((error as ServiceError).message).toBe("svc is not responding");
		expect(String((error as ServiceError).cause)).toMatch(/Unexpected response shape/);
	});
});
