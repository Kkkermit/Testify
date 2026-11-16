import { z } from "zod";
import { type Env } from "@config/env";
import { AnalyticsUnavailable, rangeOf, ShardlensReader } from "@lib/bot/shardlensReader.util";
import { serviceChecks } from "@lib/infra/serviceHealth.util";

const KEY = "slk_read_abcdefghijklmnopqrstuvwxyz0123456789";
const ENV = { SHARDLENS_URL: "https://stats.example.com/v1/ingest?token=x#y", SHARDLENS_READ_KEY: KEY } as Env;
const answer = z.object({ rows: z.array(z.object({ key: z.string() })) });

// `restoreMocks` undoes a spy before every test, so each test makes its own.
let fetchMock: jest.SpiedFunction<typeof fetch>;

function answers(status: number, body: unknown = { rows: [] }): void {
	fetchMock.mockImplementation(() => Promise.resolve(new Response(JSON.stringify(body), { status })));
}

beforeEach(() => {
	fetchMock = jest.spyOn(globalThis, "fetch");
	answers(200);
});

describe("ShardlensReader", () => {
	/** The settings are not checked at start-up, so the reader is what keeps the key off plain HTTP and odd addresses. */
	it("is off without an address the key may go to or without a read key, and asks nobody", async () => {
		const unusable = ["not an address", "http://stats.example.com", "https://user:pass@stats.example.com", "ftp://x"];
		for (const env of [
			{},
			{ SHARDLENS_URL: "https://stats.example.com" },
			{ SHARDLENS_READ_KEY: KEY },
			...unusable.map((url) => ({ SHARDLENS_URL: url, SHARDLENS_READ_KEY: KEY })),
		]) {
			await expect(new ShardlensReader(env as unknown as Env).query({ kind: "overview" }, answer)).rejects.toEqual(
				new AnalyticsUnavailable("off"),
			);
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});

	/** The read key opens the collector's figures, so it goes to the collector's own origin and nowhere else. */
	it("sends the key only as a bearer token, to the collector's origin", async () => {
		await new ShardlensReader(ENV).query({ kind: "top" }, answer);
		await new ShardlensReader({ SHARDLENS_URL: "http://localhost:8080", SHARDLENS_READ_KEY: KEY }).query(
			{ kind: "top" },
			answer,
		);

		const [url, init] = fetchMock.mock.calls[0] ?? [];
		expect(url).toBe("https://stats.example.com/v1/query");
		expect(fetchMock.mock.calls[1]?.[0]).toBe("http://localhost:8080/v1/query");
		expect(init?.method).toBe("POST");
		expect(init?.headers).toEqual({ authorization: `Bearer ${KEY}`, "content-type": "application/json" });
		expect(init?.body).not.toContain("slk_");
	});

	it("names why it could not read, and treats a query the collector rejects as a bug", async () => {
		const cases: [number, string][] = [
			[401, "refused"],
			[403, "refused"],
			[500, "unreachable"],
			[503, "unreachable"],
		];
		for (const [status, problem] of cases) {
			answers(status);
			await expect(new ShardlensReader(ENV).query({ kind: "top" }, answer)).rejects.toEqual(
				new AnalyticsUnavailable(problem as never),
			);
		}

		fetchMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));
		await expect(new ShardlensReader(ENV).query({ kind: "top" }, answer)).rejects.toEqual(
			new AnalyticsUnavailable("unreachable"),
		);

		answers(400);
		await expect(new ShardlensReader(ENV).query({ kind: "top" }, answer)).rejects.not.toBeInstanceOf(
			AnalyticsUnavailable,
		);
	});

	/** Sorting and paging the owner's tables asks the same thing again and again, and the collector limits readers. */
	it("shares an answer for a minute, and never keeps a failure", async () => {
		let now = 1_000_000;
		const reader = new ShardlensReader(ENV, () => now);

		await reader.query({ kind: "top" }, answer);
		await reader.query({ kind: "top" }, answer);
		expect(fetchMock).toHaveBeenCalledTimes(1);

		now += 60_000;
		await reader.query({ kind: "top" }, answer);
		expect(fetchMock).toHaveBeenCalledTimes(2);

		answers(500);
		await expect(reader.query({ kind: "series" }, answer)).rejects.toBeInstanceOf(AnalyticsUnavailable);
		answers(200);
		await reader.query({ kind: "series" }, answer);
		expect(fetchMock).toHaveBeenCalledTimes(4);
	});

	it("reads the collector's settings with a plain GET", async () => {
		answers(200, { rawRetentionDays: 30, mode: "audit" });

		expect(await new ShardlensReader(ENV).meta()).toEqual({ rawRetentionDays: 30, mode: "audit" });
		const [url, init] = fetchMock.mock.calls[0] ?? [];
		expect(url).toBe("https://stats.example.com/v1/meta");
		expect(init).toMatchObject({ method: "GET", headers: { authorization: `Bearer ${KEY}` } });
		expect(init?.body).toBeUndefined();
	});

	/** Only the owners read analytics, so a collector being away must not mark the bot degraded on the public page. */
	it("leaves the public status page out of it", async () => {
		answers(500);
		await expect(new ShardlensReader(ENV).query({ kind: "top" }, answer)).rejects.toBeInstanceOf(AnalyticsUnavailable);

		expect(serviceChecks(Date.now()).map((check) => check.name)).not.toContain("Shardlens");
	});
});

describe("rangeOf", () => {
	it("starts at midnight UTC and ends on the next whole minute, so a minute's reads share an answer", () => {
		const now = Date.parse("2026-11-15T13:20:05.000Z");

		expect(rangeOf(3, now)).toEqual({ from: "2026-11-13T00:00:00.000Z", to: "2026-11-15T13:21:00.000Z" });
		expect(rangeOf(3, now + 50_000)).toEqual(rangeOf(3, now));
	});
});
