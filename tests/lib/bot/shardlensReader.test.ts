import { z } from "zod";
import { type Env } from "@config/env";
import { AnalyticsUnavailable, rangeOf, ShardlensReader } from "@lib/bot/shardlensReader.util";
import { serviceChecks } from "@lib/infra/serviceHealth.util";

const KEY = `slk_read_${"r".repeat(43)}`;
const ACTIVITY_KEY = `slk_activity_${"a".repeat(43)}`;
const ENV = { SHARDLENS_URL: "https://stats.example.com/v1/ingest?token=x#y", SHARDLENS_READ_KEY: KEY } as Env;
const TOP = { kind: "top", metric: "interactions", groupBy: "command", range: rangeOf(7) } as const;
const SERIES = { kind: "series", metric: "interactions", interval: "day", range: rangeOf(7) } as const;
const page = z.object({
	rows: z.array(z.object({ command: z.string().nullable() })),
	nextBefore: z.string().nullable(),
});

// `restoreMocks` undoes a spy before every test, so each test makes its own.
let fetchMock: jest.SpiedFunction<typeof fetch>;

function answers(status: number, body: unknown = { rows: [] }, headers: Record<string, string> = {}): void {
	fetchMock.mockImplementation(() => Promise.resolve(new Response(JSON.stringify(body), { status, headers })));
}

const sentTo = (call = 0): string => {
	const input = fetchMock.mock.calls[call]?.[0];
	if (input instanceof URL) return input.href;
	return typeof input === "string" ? input : (input?.url ?? "");
};
const sentWith = (call = 0): RequestInit | undefined => fetchMock.mock.calls[call]?.[1];

beforeEach(() => {
	fetchMock = jest.spyOn(globalThis, "fetch");
	answers(200);
});

describe("ShardlensReader", () => {
	/** The settings are not checked at start-up, so the reader is what keeps a key off plain HTTP and odd addresses. */
	it("is off without an address a key may go to or without a key, and asks nobody", async () => {
		const unusable = ["not an address", "http://stats.example.com", "https://user:pass@stats.example.com", "ftp://x"];
		for (const env of [
			{},
			{ SHARDLENS_URL: "https://stats.example.com" },
			{ SHARDLENS_READ_KEY: KEY },
			...unusable.map((url) => ({ SHARDLENS_URL: url, SHARDLENS_READ_KEY: KEY })),
		]) {
			await expect(new ShardlensReader(env as unknown as Env).query(TOP)).rejects.toEqual(
				new AnalyticsUnavailable("off"),
			);
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});

	/** A key pasted into the wrong setting must not be sent anywhere, nor written into the log it is warned in. */
	it("keeps a key that is not a reader's key at home, and says which setting is wrong without repeating it", async () => {
		const warn = jest.fn();
		const ingest = `slk_ingest_${"i".repeat(43)}`;
		const reader = new ShardlensReader(
			{ SHARDLENS_URL: "https://stats.example.com", SHARDLENS_READ_KEY: ingest },
			{
				warn,
			},
		);

		await expect(reader.query(TOP)).rejects.toEqual(new AnalyticsUnavailable("off"));
		await expect(reader.query(SERIES)).rejects.toEqual(new AnalyticsUnavailable("off"));

		expect(fetchMock).not.toHaveBeenCalled();
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]?.[0]).toContain("ingest key");
		expect(warn.mock.calls[0]?.[0]).not.toContain(ingest);
	});

	/** A key opens the collector's figures, so it goes to the collector's own origin, unredirected, and nowhere else. */
	it("sends the key only as a bearer token, to the collector's origin, and follows no redirect", async () => {
		await new ShardlensReader(ENV).query(TOP);
		await new ShardlensReader({ SHARDLENS_URL: "http://localhost:8080", SHARDLENS_READ_KEY: KEY }).query(TOP);

		expect(sentTo(0)).toBe("https://stats.example.com/v1/query");
		expect(sentTo(1)).toBe("http://localhost:8080/v1/query");
		expect(sentWith()).toMatchObject({
			method: "POST",
			redirect: "manual",
			headers: { authorization: `Bearer ${KEY}`, "content-type": "application/json" },
		});
		expect(sentWith()?.body).not.toContain("slk_");
	});

	it("names why it could not read, and treats a query the collector rejects as a bug", async () => {
		const cases: [number, string][] = [
			[401, "refused"],
			[403, "refused"],
			[429, "unreachable"],
			[500, "unreachable"],
			[503, "unreachable"],
			[302, "unreachable"],
		];
		for (const [status, problem] of cases) {
			answers(status, {});
			await expect(new ShardlensReader(ENV).query(TOP)).rejects.toEqual(new AnalyticsUnavailable(problem as never));
		}

		fetchMock.mockRejectedValueOnce(new TypeError("ECONNREFUSED"));
		await expect(new ShardlensReader(ENV).query(TOP)).rejects.toEqual(new AnalyticsUnavailable("unreachable"));

		answers(400, { error: "invalid_query", message: "groupBy kind is not kept for components" });
		await expect(new ShardlensReader(ENV).query(TOP)).rejects.not.toBeInstanceOf(AnalyticsUnavailable);
	});

	/** An answer that is not what this version reads would otherwise draw as an empty chart, which looks like no use. */
	it("refuses an answer in a shape it does not read, and says so once", async () => {
		const warn = jest.fn();
		const reader = new ShardlensReader(ENV, { warn });
		answers(200, { rows: [{ key: 7 }] });

		await expect(reader.query(TOP)).rejects.toEqual(new AnalyticsUnavailable("unreachable"));
		await expect(reader.query(SERIES)).rejects.toEqual(new AnalyticsUnavailable("unreachable"));
		expect(warn).toHaveBeenCalledTimes(1);
	});

	/** A collector that is merely down is the console's to say; a refused key is a setting somebody has to change. */
	it("warns once about a refused key, and never about a collector that is only away", async () => {
		const warn = jest.fn();
		const reader = new ShardlensReader(ENV, { warn });

		answers(503, {});
		await expect(reader.query(TOP)).rejects.toBeInstanceOf(AnalyticsUnavailable);
		expect(warn).not.toHaveBeenCalled();

		answers(401, { error: "unauthorized" });
		await expect(reader.query(TOP)).rejects.toBeInstanceOf(AnalyticsUnavailable);
		await expect(reader.query(SERIES)).rejects.toBeInstanceOf(AnalyticsUnavailable);
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]?.[0]).not.toContain(KEY);
	});

	/** Sorting and paging the owner's tables asks the same thing again and again, and the collector limits readers. */
	it("shares an answer for a minute, and never keeps a failure", async () => {
		let now = 1_000_000;
		const reader = new ShardlensReader(ENV, { now: () => now });

		await reader.query(TOP);
		await reader.query(TOP);
		expect(fetchMock).toHaveBeenCalledTimes(1);

		now += 60_000;
		await reader.query(TOP);
		expect(fetchMock).toHaveBeenCalledTimes(2);

		answers(500, {});
		await expect(reader.query(SERIES)).rejects.toBeInstanceOf(AnalyticsUnavailable);
		answers(200, { points: [] });
		await reader.query(SERIES);
		expect(fetchMock).toHaveBeenCalledTimes(4);
	});

	/** A slow answer that failed after a newer one replaced it once threw the newer one away with it. */
	it("keeps a newer answer when an older one for the same question fails late", async () => {
		let now = 1_000_000;
		const reader = new ShardlensReader(ENV, { now: () => now });
		let fail: () => void = () => undefined;
		fetchMock.mockImplementationOnce(
			() =>
				new Promise<Response>((_, reject) => {
					fail = () => {
						reject(new TypeError("network"));
					};
				}),
		);

		const slow = reader.query(TOP);
		now += 60_000;
		await reader.query(TOP);
		fail();
		await expect(slow).rejects.toBeInstanceOf(AnalyticsUnavailable);
		await reader.query(TOP);

		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("reads the collector's settings with a plain GET", async () => {
		answers(200, { rawRetentionDays: 30, mode: "audit" });

		expect(await new ShardlensReader(ENV).meta()).toEqual({ rawRetentionDays: 30, mode: "audit" });
		expect(sentTo()).toBe("https://stats.example.com/v1/meta");
		expect(sentWith()).toMatchObject({ method: "GET", headers: { authorization: `Bearer ${KEY}` } });
		expect(sentWith()?.body).toBeUndefined();
	});

	/** Who ran what is behind its own key, so a read key alone never asks for it and an activity key is not spent on counts. */
	it("asks who ran what only with the activity key, and counts with the read key", async () => {
		const both = new ShardlensReader({ ...ENV, SHARDLENS_ACTIVITY_KEY: ACTIVITY_KEY });
		answers(200, { rows: [], nextBefore: null });

		await both.activityLog({ guild: "900000000000000001", outcome: "failed" }, page);
		await both.query(TOP);
		expect(sentTo(0)).toBe("https://stats.example.com/v1/audit/log?guild=900000000000000001&outcome=failed");
		expect(sentWith(0)).toMatchObject({ method: "GET", headers: { authorization: `Bearer ${ACTIVITY_KEY}` } });
		expect(sentWith(1)).toMatchObject({ headers: { authorization: `Bearer ${KEY}` } });

		const readOnly = new ShardlensReader(ENV);
		expect(readOnly.readsActivity).toBe(false);
		await expect(readOnly.activityLog({}, page)).rejects.toEqual(new AnalyticsUnavailable("off"));
		await expect(readOnly.topUsers("7d", page)).rejects.toEqual(new AnalyticsUnavailable("off"));
		expect(fetchMock).toHaveBeenCalledTimes(2);

		const activityOnly = new ShardlensReader({
			SHARDLENS_URL: ENV.SHARDLENS_URL,
			SHARDLENS_ACTIVITY_KEY: ACTIVITY_KEY,
		});
		await activityOnly.query(TOP);
		expect(sentWith(2)).toMatchObject({ headers: { authorization: `Bearer ${ACTIVITY_KEY}` } });
	});

	it("says when the collector keeps no record of who ran what, or the key cannot read it", async () => {
		const reader = new ShardlensReader({ ...ENV, SHARDLENS_ACTIVITY_KEY: ACTIVITY_KEY });

		answers(404, { error: "audit_mode_off" });
		await expect(reader.activityLog({}, page)).rejects.toEqual(new AnalyticsUnavailable("audit_off"));
		answers(403, { error: "activity_key_required" });
		await expect(reader.topUsers("24h", page)).rejects.toEqual(new AnalyticsUnavailable("refused"));
	});

	/** Only the owners read analytics, so a collector being away must not mark the bot degraded on the public page. */
	it("leaves the public status page out of it", async () => {
		answers(500, {});
		await expect(new ShardlensReader(ENV).query(TOP)).rejects.toBeInstanceOf(AnalyticsUnavailable);

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
