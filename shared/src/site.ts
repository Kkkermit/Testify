import { z } from "zod";

/** The public website's contract: what the landing page, the docs and the source browser read before any sign-in. */

export const SITE_LIMITS = {
	/** GitHub is asked at most this often for one answer, and only because somebody opened a page that shows it. */
	cacheMinutes: 60,
	/** Larger files are listed and linked, never shown, because a browser tab is not the place to read them. */
	maxFileBytes: 512 * 1024,
	/** Read files kept in memory, so browsing back and forth costs nobody a second request. */
	filesCached: 200,
	/** GitHub keeps 14 days of traffic, so each day it reports is kept here for this long. */
	trafficDaysKept: 365,
	/** The chart's longest window. */
	trafficDaysShown: 90,
	pathMax: 400,
} as const;

export interface SiteInfo {
	/** Whether sign-in and the server screens exist on this host; the site answers either way. */
	dashboard: boolean;
	/** The repository the source browser reads, as `theme.repository` names it. */
	repository: string;
	/** The release this copy runs, which the source browser and the docs describe. */
	version: string;
}

export interface LatestRelease {
	tag: string;
	name: string;
	url: string;
	publishedAt: string | null;
}

/** Everything GitHub says about the repository without a token. */
export interface RepositoryStanding {
	url: string;
	fullName: string;
	description: string | null;
	stars: number;
	forks: number;
	watchers: number;
	openIssues: number;
	/** `custom` is GitHub saying the licence is not one it recognises, which it names "Other". */
	license: { name: string; custom: boolean } | null;
	defaultBranch: string;
	pushedAt: string | null;
	latestRelease: LatestRelease | null;
	/** The tag of the running version when GitHub has it, otherwise the default branch. */
	ref: string;
}

export interface TrafficDay {
	/** `YYYY-MM-DD`, in UTC as GitHub counts it. */
	date: string;
	views: number;
	uniqueViews: number;
	clones: number;
	uniqueClones: number;
}

export interface TrafficSource {
	name: string;
	count: number;
	uniques: number;
}

export type TrafficUnavailable = "no_token" | "refused";

export type RepositoryTraffic =
	| { available: false; reason: TrafficUnavailable }
	| {
			available: true;
			/** Oldest first, every day kept here as well as the 14 GitHub still holds. */
			days: TrafficDay[];
			referrers: TrafficSource[];
			/** Each named by its path on GitHub, so the most viewed pages can link back. */
			pages: (TrafficSource & { path: string })[];
	  };

export interface SourceEntry {
	path: string;
	type: "file" | "folder";
	/** Null for a folder. */
	size: number | null;
}

export interface SourceTree {
	ref: string;
	entries: SourceEntry[];
	/** GitHub stops listing a very large tree, and the page says so rather than pretending it is whole. */
	truncated: boolean;
}

export type SourceFileWithheld = "binary" | "too_large";

export interface SourceFile {
	path: string;
	ref: string;
	size: number;
	/** Null when the file is not shown here, and `withheld` says why. */
	text: string | null;
	withheld: SourceFileWithheld | null;
	githubUrl: string;
}

/** A path inside the repository, never one that climbs out of it or names the root. */
export const sourcePath = z
	.string()
	.min(1)
	.max(SITE_LIMITS.pathMax)
	.refine(
		(path) => !path.startsWith("/") && !path.split("/").some((part) => part === "" || part === "." || part === ".."),
		{
			message: "must be a path inside the repository",
		},
	);

export const sourceFileQuery = z.object({ path: sourcePath }).strict();

/** The part of a repository address the GitHub API is asked about; null for anything that is not one. */
export function repositoryCoordinates(url: string): { owner: string; repo: string } | null {
	const match = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(url);
	if (match === null) return null;

	const [, owner, repo] = match;
	return owner === undefined || repo === undefined ? null : { owner, repo };
}

/** The same file on GitHub, at the ref the browser read it from. */
export function githubFileUrl(repository: string, ref: string, path: string): string {
	const encoded = (value: string): string => value.split("/").map(encodeURIComponent).join("/");
	return `${repository}/blob/${encoded(ref)}/${encoded(path)}`;
}
