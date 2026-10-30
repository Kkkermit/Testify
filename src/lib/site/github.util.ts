import { extname } from "node:path";
import { z } from "zod";
import { DAY_MS, MINUTE_MS } from "@config/constants";
import { ServiceError } from "@core/errors";
import { type Logger } from "@core/logger";
import { keepTrafficDays, readTrafficDays } from "@database/repositories/githubTrafficRepository";
import { fetchJson, fetchRaw } from "@lib/infra/http.util";
import {
	githubFileUrl,
	type RepositoryStanding,
	type RepositoryTraffic,
	repositoryCoordinates,
	SITE_LIMITS,
	type SourceFile,
	type SourceTree,
	type TrafficDay,
} from "@testify/shared";

/** What the website reads from GitHub: only when a page asks, an hour at a time, and nothing secret is ever sent. */

const SERVICE = "GitHub";
const API = "https://api.github.com";
const RAW = "https://raw.githubusercontent.com";

/** Why a page cannot have what it asked for; the route words each one. */
export type SiteRefusal = "no_repository" | "private_repository" | "unknown_file";

export class SiteProblem extends Error {
	constructor(readonly reason: SiteRefusal) {
		super(reason);
		this.name = "SiteProblem";
	}
}

/** One answer per key for a while; a request already on its way is shared, and a failed one is not kept. */
export class TimedCache<T> {
	readonly #entries = new Map<string, { at: number; value: Promise<T> }>();

	constructor(
		readonly ttlMs: number,
		readonly maxEntries = Number.POSITIVE_INFINITY,
		readonly now: () => number = Date.now,
	) {}

	get(key: string, load: () => Promise<T>): Promise<T> {
		const found = this.#entries.get(key);
		if (found !== undefined && this.now() - found.at < this.ttlMs) return found.value;

		const value = load();
		this.#entries.delete(key);
		this.#entries.set(key, { at: this.now(), value });
		void value.catch(() => {
			if (this.#entries.get(key)?.value === value) this.#entries.delete(key);
		});

		for (const oldest of this.#entries.keys()) {
			if (this.#entries.size <= this.maxEntries) break;
			this.#entries.delete(oldest);
		}
		return value;
	}
}

const repositorySchema = z.object({
	html_url: z.string(),
	full_name: z.string(),
	description: z.string().nullable(),
	private: z.boolean(),
	stargazers_count: z.number(),
	forks_count: z.number(),
	// `watchers_count` is the star count under an old name; subscribers are the people watching.
	subscribers_count: z.number(),
	open_issues_count: z.number(),
	license: z.object({ name: z.string(), spdx_id: z.string().nullable() }).nullable(),
	default_branch: z.string(),
	pushed_at: z.string().nullable(),
});

const releaseSchema = z.object({
	tag_name: z.string(),
	name: z.string().nullable(),
	html_url: z.string(),
	published_at: z.string().nullable(),
});

const refSchema = z.object({ object: z.object({ sha: z.string(), type: z.string() }) });
const tagSchema = z.object({ object: z.object({ sha: z.string() }) });

const treeSchema = z.object({
	tree: z.array(z.object({ path: z.string(), type: z.string(), size: z.number().optional() })),
	truncated: z.boolean(),
});

const countSchema = z.object({ timestamp: z.string(), count: z.number(), uniques: z.number() });
const viewsSchema = z.object({ views: z.array(countSchema) });
const clonesSchema = z.object({ clones: z.array(countSchema) });
const referrersSchema = z.array(z.object({ referrer: z.string(), count: z.number(), uniques: z.number() }));
const pagesSchema = z.array(z.object({ path: z.string(), title: z.string(), count: z.number(), uniques: z.number() }));

/** Shown as a link rather than as text, which is all a browser could do with them. */
const BINARY = new Set([
	".png",
	".jpg",
	".jpeg",
	".gif",
	".webp",
	".ico",
	".woff",
	".woff2",
	".ttf",
	".otf",
	".mp3",
	".ogg",
	".zip",
	".gz",
	".pdf",
]);

/** The tag names a release of `version` could have; this repository uses the first. */
export function releaseTags(version: string): string[] {
	return [`release/v${version}`, `v${version}`, version];
}

/** GitHub's per-day views and clones folded into one row a day, oldest first. */
export function trafficDays(
	views: readonly z.infer<typeof countSchema>[],
	clones: readonly z.infer<typeof countSchema>[],
): TrafficDay[] {
	const days = new Map<string, TrafficDay>();
	const day = (timestamp: string): TrafficDay => {
		const date = timestamp.slice(0, 10);
		const found = days.get(date) ?? { date, views: 0, uniqueViews: 0, clones: 0, uniqueClones: 0 };
		days.set(date, found);
		return found;
	};

	for (const entry of views) Object.assign(day(entry.timestamp), { views: entry.count, uniqueViews: entry.uniques });
	for (const entry of clones) Object.assign(day(entry.timestamp), { clones: entry.count, uniqueClones: entry.uniques });

	return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** A day this many days before `now`, as GitHub dates its traffic. */
export function daysBefore(now: number, days: number): string {
	return new Date(now - days * DAY_MS).toISOString().slice(0, 10);
}

export interface GitHubReaderOptions {
	repository: string;
	version: string;
	logger: Logger;
	/** Only the traffic needs one; with it the public numbers come from a far larger allowance too. */
	token?: string | undefined;
	now?: () => number;
}

interface Source {
	ref: string;
	commit: string;
}

export class GitHubReader {
	readonly #coordinates: { owner: string; repo: string } | null;
	readonly #options: GitHubReaderOptions;
	readonly #answers: TimedCache<unknown>;
	readonly #files: TimedCache<SourceFile>;

	constructor(options: GitHubReaderOptions) {
		this.#options = options;
		this.#coordinates = repositoryCoordinates(options.repository);
		const ttl = SITE_LIMITS.cacheMinutes * MINUTE_MS;
		this.#answers = new TimedCache(ttl, Number.POSITIVE_INFINITY, options.now);
		this.#files = new TimedCache(ttl, SITE_LIMITS.filesCached, options.now);
	}

	standing(): Promise<RepositoryStanding> {
		return this.#cached("standing", async () => {
			const [repo, release, source] = await Promise.all([
				this.#repo(),
				this.#api("/releases/latest", releaseSchema).catch(nullOnNotFound),
				this.#source(),
			]);

			return {
				url: repo.html_url,
				fullName: repo.full_name,
				description: repo.description,
				stars: repo.stargazers_count,
				forks: repo.forks_count,
				watchers: repo.subscribers_count,
				openIssues: repo.open_issues_count,
				license:
					repo.license === null ? null : { name: repo.license.name, custom: repo.license.spdx_id === "NOASSERTION" },
				defaultBranch: repo.default_branch,
				pushedAt: repo.pushed_at,
				latestRelease:
					release === null
						? null
						: {
								tag: release.tag_name,
								name: release.name ?? release.tag_name,
								url: release.html_url,
								publishedAt: release.published_at,
							},
				ref: source.ref,
			};
		});
	}

	tree(): Promise<SourceTree> {
		return this.#cached("tree", async () => {
			const source = await this.#readable();
			const tree = await this.#api(`/git/trees/${source.commit}`, treeSchema, { recursive: 1 });

			return {
				ref: source.ref,
				truncated: tree.truncated,
				entries: tree.tree
					.filter((entry) => entry.type === "blob" || entry.type === "tree")
					.map((entry) => ({
						path: entry.path,
						type: entry.type === "blob" ? ("file" as const) : ("folder" as const),
						size: entry.type === "blob" ? (entry.size ?? 0) : null,
					})),
			};
		});
	}

	/** Only a file the tree lists can be asked for, so no request names a path GitHub was not already showing. */
	async file(path: string): Promise<SourceFile> {
		const [tree, source] = await Promise.all([this.tree(), this.#readable()]);
		const entry = tree.entries.find((candidate) => candidate.path === path && candidate.type === "file");
		if (entry === undefined) throw new SiteProblem("unknown_file");

		const size = entry.size ?? 0;
		const shown = { path, ref: source.ref, size, githubUrl: githubFileUrl(this.#options.repository, source.ref, path) };

		return this.#files.get(`${source.commit}:${path}`, async () => {
			if (size > SITE_LIMITS.maxFileBytes) return { ...shown, text: null, withheld: "too_large" as const };
			if (BINARY.has(extname(path).toLowerCase())) return { ...shown, text: null, withheld: "binary" as const };

			const { owner, repo } = this.#repository();
			const encoded = path.split("/").map(encodeURIComponent).join("/");
			const response = await fetchRaw(SERVICE, `${RAW}/${owner}/${repo}/${source.commit}/${encoded}`, {
				headers: { "user-agent": `${owner}/${repo}` },
			});
			const text = await response.text();

			// A NUL is what every text format lacks, so a file with one is binary whatever its name says.
			return text.includes("\u0000")
				? { ...shown, text: null, withheld: "binary" as const }
				: { ...shown, text, withheld: null };
		});
	}

	traffic(): Promise<RepositoryTraffic> {
		if (this.#options.token === undefined) return Promise.resolve({ available: false, reason: "no_token" });

		return this.#cached("traffic", async () => {
			try {
				const [views, clones, referrers, pages] = await Promise.all([
					this.#api("/traffic/views", viewsSchema),
					this.#api("/traffic/clones", clonesSchema),
					this.#api("/traffic/popular/referrers", referrersSchema),
					this.#api("/traffic/popular/paths", pagesSchema),
				]);

				return {
					available: true,
					days: await this.#history(trafficDays(views.views, clones.clones)),
					referrers: referrers.map((entry) => ({ name: entry.referrer, count: entry.count, uniques: entry.uniques })),
					pages: pages.map((entry) => ({
						name: entry.title,
						path: entry.path,
						count: entry.count,
						uniques: entry.uniques,
					})),
				};
			} catch (error) {
				// A token without Administration read, or one that has been revoked: the host's to fix, not an outage.
				if (error instanceof ServiceError && (error.status === 401 || error.status === 403)) {
					return { available: false, reason: "refused" };
				}
				throw error;
			}
		});
	}

	/** Every day kept here, with GitHub's own answer for the days it still holds written over them first. */
	async #history(fresh: TrafficDay[]): Promise<TrafficDay[]> {
		const now = (this.#options.now ?? Date.now)();

		try {
			await keepTrafficDays(fresh, now);
			return await readTrafficDays(daysBefore(now, SITE_LIMITS.trafficDaysShown));
		} catch (error) {
			this.#options.logger.warn(
				{ err: error },
				"[SITE] Could not keep the repository's traffic. Showing GitHub's last 14 days instead.",
			);
			return fresh;
		}
	}

	#repo(): Promise<z.infer<typeof repositorySchema>> {
		return this.#cached("repo", () => this.#api("", repositorySchema));
	}

	/** The tag of the running release when GitHub has one, so the code shown is the code running; else the default branch. */
	#source(): Promise<Source> {
		return this.#cached("source", async () => {
			for (const tag of releaseTags(this.#options.version)) {
				const commit = await this.#commitOf(`tags/${tag}`);
				if (commit !== null) return { ref: tag, commit };
			}

			const { default_branch: branch } = await this.#repo();
			const commit = await this.#commitOf(`heads/${branch}`);
			if (commit === null) throw new SiteProblem("no_repository");
			return { ref: branch, commit };
		});
	}

	async #commitOf(ref: string): Promise<string | null> {
		const found = await this.#api(`/git/ref/${ref.split("/").map(encodeURIComponent).join("/")}`, refSchema).catch(
			nullOnNotFound,
		);
		if (found === null) return null;
		if (found.object.type === "commit") return found.object.sha;

		// An annotated tag points at a tag object, which points at the commit.
		const tag = await this.#api(`/git/tags/${found.object.sha}`, tagSchema);
		return tag.object.sha;
	}

	/** The source browser stops at a private repository, which a host's token could otherwise read out to anybody. */
	async #readable(): Promise<Source> {
		if ((await this.#repo()).private) throw new SiteProblem("private_repository");
		return this.#source();
	}

	#cached<T>(key: string, load: () => Promise<T>): Promise<T> {
		return this.#answers.get(key, load) as Promise<T>;
	}

	#repository(): { owner: string; repo: string } {
		if (this.#coordinates === null) throw new SiteProblem("no_repository");
		return this.#coordinates;
	}

	#api<T>(path: string, schema: z.ZodType<T>, query?: Record<string, string | number>): Promise<T> {
		const { owner, repo } = this.#repository();
		const token = this.#options.token;

		return fetchJson(SERVICE, `${API}/repos/${owner}/${repo}${path}`, schema, {
			headers: {
				accept: "application/vnd.github+json",
				"x-github-api-version": "2022-11-28",
				// GitHub refuses a request that does not say who is asking.
				"user-agent": `${owner}/${repo}`,
				...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
			},
			...(query === undefined ? {} : { query }),
		});
	}
}

function nullOnNotFound(error: unknown): null {
	if (error instanceof ServiceError && error.status === 404) return null;
	throw error;
}
