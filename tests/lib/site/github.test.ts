import { ServiceError } from "@core/errors";
import { keepTrafficDays, readTrafficDays } from "@database/repositories/githubTrafficRepository";
import { fetchJson, fetchRaw } from "@lib/infra/http.util";
import { GitHubReader, releaseTags, SiteProblem, TimedCache, trafficDays } from "@lib/site/github.util";
import { SITE_LIMITS } from "@testify/shared";

jest.mock("@lib/infra/http.util", () => ({ fetchJson: jest.fn(), fetchRaw: jest.fn() }));
jest.mock("@database/repositories/githubTrafficRepository", () => ({
	keepTrafficDays: jest.fn(() => Promise.resolve()),
	readTrafficDays: jest.fn(() => Promise.resolve([])),
}));

const REPOSITORY = "https://github.com/owner/bot";
const API = "https://api.github.com/repos/owner/bot";
const COMMIT = "a".repeat(40);
const BRANCH_COMMIT = "b".repeat(40);

const repo = (overrides: object = {}) => ({
	html_url: REPOSITORY,
	full_name: "owner/bot",
	description: "A bot",
	private: false,
	stargazers_count: 140,
	forks_count: 57,
	subscribers_count: 3,
	open_issues_count: 1,
	license: { name: "Other", spdx_id: "NOASSERTION" },
	default_branch: "main",
	pushed_at: "2026-10-29T15:09:01Z",
	...overrides,
});

const notFound = (): ServiceError => new ServiceError("GitHub", new Error("HTTP 404"), 404);

/** GitHub as a table of answers by address; anything not in it is a 404, as GitHub would say. */
function github(answers: Record<string, unknown>): void {
	jest.mocked(fetchJson).mockImplementation((_service, url, schema) => {
		const key = url.replace(API, "");
		if (!(key in answers)) return Promise.reject(notFound());
		const answer = answers[key];
		if (answer instanceof Error) return Promise.reject(answer);
		return Promise.resolve(schema.parse(answer));
	});
}

const tree = {
	truncated: false,
	tree: [
		{ path: "src", type: "tree" },
		{ path: "src/index.ts", type: "blob", size: 120 },
		{ path: "docs/banner.png", type: "blob", size: 2_000 },
		{ path: "package-lock.json", type: "blob", size: SITE_LIMITS.maxFileBytes + 1 },
		{ path: "vendor", type: "commit" },
	],
};

const releaseAnswers = {
	"": repo(),
	"/releases/latest": {
		tag_name: "release/v2.0.9",
		name: null,
		html_url: `${REPOSITORY}/releases/1`,
		published_at: null,
	},
	"/git/ref/tags/release/v2.0.9": { object: { sha: COMMIT, type: "commit" } },
	"/git/ref/heads/main": { object: { sha: BRANCH_COMMIT, type: "commit" } },
	[`/git/trees/${COMMIT}`]: tree,
};

function reader(options: { token?: string; version?: string } = {}): GitHubReader {
	return new GitHubReader({
		repository: REPOSITORY,
		version: options.version ?? "2.0.9",
		token: options.token,
		logger: { warn: jest.fn() } as never,
	});
}

function rawFile(text: string): void {
	jest.mocked(fetchRaw).mockResolvedValue({ text: () => Promise.resolve(text) } as Response);
}

beforeEach(() => {
	jest.clearAllMocks();
	github(releaseAnswers);
});

describe("releaseTags", () => {
	/** This repository tags `release/v2.0.9`; a fork may use either of the usual spellings. */
	it("tries this repository's spelling first", () => {
		expect(releaseTags("2.0.9")).toEqual(["release/v2.0.9", "v2.0.9", "2.0.9"]);
	});
});

describe("trafficDays", () => {
	it("folds views and clones into one row a day, oldest first", () => {
		expect(
			trafficDays(
				[{ timestamp: "2026-10-28T00:00:00Z", count: 9, uniques: 4 }],
				[
					{ timestamp: "2026-10-28T00:00:00Z", count: 2, uniques: 1 },
					{ timestamp: "2026-10-27T00:00:00Z", count: 5, uniques: 3 },
				],
			),
		).toEqual([
			{ date: "2026-10-27", views: 0, uniqueViews: 0, clones: 5, uniqueClones: 3 },
			{ date: "2026-10-28", views: 9, uniqueViews: 4, clones: 2, uniqueClones: 1 },
		]);
	});
});

describe("TimedCache", () => {
	it("shares a request on its way, keeps the answer for its time, and asks again after it", async () => {
		let now = 0;
		const cache = new TimedCache<number>(1_000, Number.POSITIVE_INFINITY, () => now);
		const load = jest.fn(() => Promise.resolve(1));

		await Promise.all([cache.get("a", load), cache.get("a", load)]);
		now = 999;
		await cache.get("a", load);
		expect(load).toHaveBeenCalledTimes(1);

		now = 1_000;
		await cache.get("a", load);
		expect(load).toHaveBeenCalledTimes(2);
	});

	/** A failure kept for an hour would refuse every reader for an hour after GitHub recovered. */
	it("does not keep a failure", async () => {
		const cache = new TimedCache<number>(1_000);

		await expect(cache.get("a", () => Promise.reject(new Error("down")))).rejects.toThrow("down");
		await expect(cache.get("a", () => Promise.resolve(2))).resolves.toBe(2);
	});

	it("lets go of the oldest answer past its size", async () => {
		const cache = new TimedCache<string>(1_000, 2);
		const load = jest.fn((key: string) => Promise.resolve(key));

		for (const key of ["a", "b", "c", "a"]) await cache.get(key, () => load(key));

		expect(load.mock.calls.map(([key]) => key)).toEqual(["a", "b", "c", "a"]);
	});
});

describe("GitHubReader", () => {
	/** The code shown is the code running: the running version's tag, not whatever the default branch holds now. */
	it("reads the running release's tag, and the default branch when GitHub has no such tag", async () => {
		expect(await reader().standing()).toMatchObject({
			stars: 140,
			forks: 57,
			watchers: 3,
			ref: "release/v2.0.9",
			latestRelease: { tag: "release/v2.0.9", name: "release/v2.0.9" },
		});
		expect(await reader({ version: "9.9.9" }).standing()).toMatchObject({ ref: "main" });
	});

	it("follows an annotated tag to its commit", async () => {
		github({
			...releaseAnswers,
			"/git/ref/tags/release/v2.0.9": { object: { sha: "c".repeat(40), type: "tag" } },
			[`/git/tags/${"c".repeat(40)}`]: { object: { sha: COMMIT } },
		});

		expect((await reader().tree()).ref).toBe("release/v2.0.9");
	});

	/** "Never phones home": GitHub hears from the bot once an hour per answer, however many readers there are. */
	it("asks GitHub once for any number of readers", async () => {
		const shared = reader();

		await Promise.all([shared.standing(), shared.standing(), shared.tree(), shared.tree()]);

		const asked = jest.mocked(fetchJson).mock.calls.map(([, url]) => url.replace(API, ""));
		expect(asked.filter((path) => path === "")).toHaveLength(1);
		expect(asked.filter((path) => path.startsWith("/git/trees"))).toHaveLength(1);
	});

	it("lists files and folders, and leaves out what is neither", async () => {
		expect((await reader().tree()).entries).toEqual([
			{ path: "src", type: "folder", size: null },
			{ path: "src/index.ts", type: "file", size: 120 },
			{ path: "docs/banner.png", type: "file", size: 2_000 },
			{ path: "package-lock.json", type: "file", size: SITE_LIMITS.maxFileBytes + 1 },
		]);
	});

	/** A path is only ever one GitHub already listed, so no request can name something else. */
	it("refuses a file the tree does not list, without asking GitHub for it", async () => {
		await expect(reader().file("src/../.env")).rejects.toEqual(new SiteProblem("unknown_file"));
		await expect(reader().file("src")).rejects.toEqual(new SiteProblem("unknown_file"));
		expect(fetchRaw).not.toHaveBeenCalled();
	});

	it("reads a text file at the commit it listed, and links to it on GitHub", async () => {
		rawFile("export {};\n");

		expect(await reader().file("src/index.ts")).toEqual({
			path: "src/index.ts",
			ref: "release/v2.0.9",
			size: 120,
			text: "export {};\n",
			withheld: null,
			githubUrl: `${REPOSITORY}/blob/release/v2.0.9/src/index.ts`,
		});
		expect(jest.mocked(fetchRaw).mock.calls[0]?.[1]).toBe(
			`https://raw.githubusercontent.com/owner/bot/${COMMIT}/src/index.ts`,
		);
	});

	it("withholds a picture and a huge file without downloading either, and a file with a NUL after reading it", async () => {
		rawFile("GIF89a\u0000");
		github({
			...releaseAnswers,
			[`/git/trees/${COMMIT}`]: { ...tree, tree: [...tree.tree, { path: "a.txt", type: "blob", size: 7 }] },
		});
		const shared = reader();

		expect((await shared.file("docs/banner.png")).withheld).toBe("binary");
		expect((await shared.file("package-lock.json")).withheld).toBe("too_large");
		expect(fetchRaw).not.toHaveBeenCalled();

		expect(await shared.file("a.txt")).toMatchObject({ text: null, withheld: "binary" });
	});

	/** With a token for its traffic, the bot could otherwise read a private repository out to anybody. */
	it("shows nothing of a private repository's code", async () => {
		github({ ...releaseAnswers, "": repo({ private: true }) });

		await expect(reader({ token: "token" }).tree()).rejects.toEqual(new SiteProblem("private_repository"));
		await expect(reader({ token: "token" }).file("src/index.ts")).rejects.toEqual(
			new SiteProblem("private_repository"),
		);
	});

	it("says there is no traffic without a token, and asks GitHub nothing", async () => {
		expect(await reader().traffic()).toEqual({ available: false, reason: "no_token" });
		expect(fetchJson).not.toHaveBeenCalled();
	});

	it("says a token GitHub refuses was refused, rather than that GitHub is down", async () => {
		github({ ...releaseAnswers, "/traffic/views": new ServiceError("GitHub", new Error("HTTP 403"), 403) });

		expect(await reader({ token: "token" }).traffic()).toEqual({ available: false, reason: "refused" });
	});

	/** GitHub keeps 14 days, so each answer is kept and the chart reads every day kept since. */
	it("keeps each day GitHub reports and shows every day kept", async () => {
		const kept = [{ date: "2026-08-01", views: 1, uniqueViews: 1, clones: 0, uniqueClones: 0 }];
		jest.mocked(readTrafficDays).mockResolvedValue(kept);
		github({
			...releaseAnswers,
			"/traffic/views": { views: [{ timestamp: "2026-10-28T00:00:00Z", count: 9, uniques: 4 }] },
			"/traffic/clones": { clones: [] },
			"/traffic/popular/referrers": [{ referrer: "github.com", count: 5, uniques: 2 }],
			"/traffic/popular/paths": [{ path: "/owner/bot", title: "bot", count: 7, uniques: 3 }],
		});

		expect(await reader({ token: "token" }).traffic()).toEqual({
			available: true,
			days: kept,
			referrers: [{ name: "github.com", count: 5, uniques: 2 }],
			pages: [{ name: "bot", path: "/owner/bot", count: 7, uniques: 3 }],
		});
		expect(keepTrafficDays).toHaveBeenCalledWith(
			[{ date: "2026-10-28", views: 9, uniqueViews: 4, clones: 0, uniqueClones: 0 }],
			expect.any(Number),
		);
	});

	it("sends the token to GitHub's API only when there is one", async () => {
		await reader().standing();
		await reader({ token: "token" }).standing();

		const auth = jest.mocked(fetchJson).mock.calls.map(([, , , options]) => options?.headers?.authorization);
		expect(auth).toContain(undefined);
		expect(auth).toContain("Bearer token");
	});

	it("refuses an address that is not a GitHub repository", async () => {
		const elsewhere = new GitHubReader({
			repository: "https://example.com/bot",
			version: "1.0.0",
			logger: {} as never,
		});

		await expect(elsewhere.standing()).rejects.toEqual(new SiteProblem("no_repository"));
	});
});
