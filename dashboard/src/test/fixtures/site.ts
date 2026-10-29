import {
	type RepositoryStanding,
	type RepositoryTraffic,
	type SiteInfo,
	type SourceFile,
	type SourceTree,
} from "@testify/shared";

export const siteInfo: SiteInfo = {
	dashboard: true,
	repository: "https://github.com/Kkkermit/Testify",
	version: "2.0.9",
};

export const standing: RepositoryStanding = {
	url: "https://github.com/Kkkermit/Testify",
	fullName: "Kkkermit/Testify",
	description: "An all-in-one Discord bot.",
	stars: 140,
	forks: 57,
	watchers: 3,
	openIssues: 1,
	license: "Other",
	defaultBranch: "main",
	pushedAt: "2026-10-29T15:09:01Z",
	latestRelease: {
		tag: "release/v2.0.9",
		name: "v2.0.9",
		url: "https://github.com/Kkkermit/Testify/releases/1",
		publishedAt: null,
	},
	ref: "release/v2.0.9",
};

export const sourceTree: SourceTree = {
	ref: "release/v2.0.9",
	truncated: false,
	entries: [
		{ path: "README.md", type: "file", size: 120 },
		{ path: "src", type: "folder", size: null },
		{ path: "src/core", type: "folder", size: null },
		{ path: "src/core/loader.ts", type: "file", size: 64 },
		{ path: "src/index.ts", type: "file", size: 32 },
		{ path: "docs", type: "folder", size: null },
		{ path: "docs/banner.png", type: "file", size: 2_048 },
	],
};

export function sourceFile(path: string): SourceFile {
	const base = {
		path,
		ref: "release/v2.0.9",
		githubUrl: `https://github.com/Kkkermit/Testify/blob/release/v2.0.9/${path}`,
	};
	if (path.endsWith(".png")) return { ...base, size: 2_048, text: null, withheld: "binary" };
	if (path === "README.md") return { ...base, size: 120, text: "# Testify\n\nA **bot**.\n", withheld: null };
	return { ...base, size: 64, text: "export const answer = 42;\n// done\n", withheld: null };
}

export const noTraffic: RepositoryTraffic = { available: false, reason: "no_token" };
