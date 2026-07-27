import { z } from "zod";
import { ServiceError } from "@core/errors";
import { fetchJson, fetchRaw } from "@lib/http.util";

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
});

describe("fetchRaw", () => {
	it("returns the response when the call succeeds", async () => {
		stubFetch(() => response("ok"));
		await expect(fetchRaw("svc", "https://example.test/a")).resolves.toMatchObject({ ok: true });
	});

	it("defaults to GET", async () => {
		const mock = stubFetch(() => response("ok"));
		await fetchRaw("svc", "https://example.test/a");

		expect(mock.mock.calls[0]?.[1]).toMatchObject({ method: "GET" });
	});

	it("passes the method, headers and body through", async () => {
		const mock = stubFetch(() => response("ok"));
		await fetchRaw("svc", "https://example.test/a", {
			method: "POST",
			headers: { "x-test": "1" },
			body: "payload",
		});

		expect(mock.mock.calls[0]?.[1]).toMatchObject({
			method: "POST",
			headers: { "x-test": "1" },
			body: "payload",
		});
	});

	it("appends query parameters", async () => {
		const mock = stubFetch(() => response("ok"));
		await fetchRaw("svc", "https://example.test/a", { query: { q: "cats", page: 2, exact: true } });

		const url = new URL(String(mock.mock.calls[0]?.[0]));
		expect(url.searchParams.get("q")).toBe("cats");
		expect(url.searchParams.get("page")).toBe("2");
		expect(url.searchParams.get("exact")).toBe("true");
	});

	it("leaves undefined query parameters off entirely", async () => {
		const mock = stubFetch(() => response("ok"));
		await fetchRaw("svc", "https://example.test/a", { query: { kept: "yes", skipped: undefined } });

		const url = new URL(String(mock.mock.calls[0]?.[0]));
		expect(url.searchParams.has("skipped")).toBe(false);
		expect(url.searchParams.get("kept")).toBe("yes");
	});

	it("turns a non-2xx response into a ServiceError naming the service", async () => {
		stubFetch(() => response(null, { ok: false, status: 503 }));

		await expect(fetchRaw("weather", "https://example.test/a")).rejects.toBeInstanceOf(ServiceError);
		await expect(fetchRaw("weather", "https://example.test/a")).rejects.toThrow(/weather/);
	});

	it("wraps a network failure rather than letting it escape raw", async () => {
		stubFetch(() => {
			throw new Error("ECONNREFUSED");
		});

		await expect(fetchRaw("svc", "https://example.test/a")).rejects.toBeInstanceOf(ServiceError);
	});

	it("does not double-wrap a ServiceError it already produced", async () => {
		stubFetch(() => response(null, { ok: false, status: 500 }));

		const error = await fetchRaw("svc", "https://example.test/a").catch((problem: unknown) => problem);
		expect(error).toBeInstanceOf(ServiceError);
		expect((error as ServiceError).cause).not.toBeInstanceOf(ServiceError);
	});
});

describe("fetchJson", () => {
	const schema = z.object({ name: z.string() });

	it("returns the parsed body when it matches the schema", async () => {
		stubFetch(() => response({ name: "testify" }));
		await expect(fetchJson("svc", "https://example.test/a", schema)).resolves.toEqual({ name: "testify" });
	});

	it("rejects a body that does not match, rather than passing bad data on", async () => {
		stubFetch(() => response({ nome: "typo" }));

		const error = await fetchJson("svc", "https://example.test/a", schema).catch((problem: unknown) => problem);

		// The user-facing message stays generic; the detail lives on `cause`, so a
		// schema mismatch never reaches chat as a raw zod dump.
		expect(error).toBeInstanceOf(ServiceError);
		expect((error as ServiceError).message).toBe("svc is not responding");
		expect(String((error as ServiceError).cause)).toMatch(/Unexpected response shape/);
	});

	it("wraps a body that is not JSON at all", async () => {
		stubFetch(() =>
			response(null, {
				json: () => Promise.reject(new Error("Unexpected token <")),
			}),
		);

		await expect(fetchJson("svc", "https://example.test/a", schema)).rejects.toBeInstanceOf(ServiceError);
	});
});
