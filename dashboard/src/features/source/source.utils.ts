import { type SourceEntry } from "@testify/shared";

/** The repository's flat list from GitHub as the folders a person browses. */

export interface TreeIndex {
	/** Every folder's direct children, folders first and then files, each alphabetical; `""` is the root. */
	children: ReadonlyMap<string, readonly SourceEntry[]>;
	byPath: ReadonlyMap<string, SourceEntry>;
}

export function parentOf(path: string): string {
	return path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
}

export function nameOf(path: string): string {
	return path.slice(path.lastIndexOf("/") + 1);
}

export function indexTree(entries: readonly SourceEntry[]): TreeIndex {
	const children = new Map<string, SourceEntry[]>([["", []]]);
	const byPath = new Map<string, SourceEntry>();

	for (const entry of entries) {
		byPath.set(entry.path, entry);
		if (entry.type === "folder" && !children.has(entry.path)) children.set(entry.path, []);
		const parent = parentOf(entry.path);
		children.set(parent, [...(children.get(parent) ?? []), entry]);
	}

	for (const list of children.values()) {
		list.sort((a, b) =>
			a.type === b.type ? nameOf(a.path).localeCompare(nameOf(b.path)) : a.type === "folder" ? -1 : 1,
		);
	}

	return { children, byPath };
}

/** Each folder above a path, outermost first, which is what the tree opens to show it. */
export function ancestorsOf(path: string): string[] {
	const parts = path.split("/").filter(Boolean);
	return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join("/"));
}

/** Files whose path holds every word typed, so `core load` finds `src/core/loader.ts`. */
export function matchingFiles(entries: readonly SourceEntry[], query: string, limit = 50): SourceEntry[] {
	const words = query.toLowerCase().split(/\s+/).filter(Boolean);
	if (words.length === 0) return [];

	return entries
		.filter((entry) => entry.type === "file" && words.every((word) => entry.path.toLowerCase().includes(word)))
		.slice(0, limit);
}

/** The folder a README beside it would introduce, as GitHub shows one. */
export function readmeIn(index: TreeIndex, folder: string): SourceEntry | undefined {
	return index.children.get(folder)?.find((entry) => entry.type === "file" && /^readme\.md$/i.test(nameOf(entry.path)));
}

export function lineCount(text: string): number {
	return text === "" ? 0 : text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
}

/** `src/core` as the route that shows it. */
export function sourceRoute(path: string): string {
	return path === "" ? "/source-code" : `/source-code/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** Bytes as a person reads them, in the binary steps a file manager uses. */
export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${String(bytes)} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
