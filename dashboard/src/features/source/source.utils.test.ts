import {
	ancestorsOf,
	formatBytes,
	indexTree,
	lineCount,
	matchingFiles,
	readmeIn,
	sourceRoute,
} from "@/features/source/source.utils";
import { sourceTree } from "@/test/fixtures/site";

describe("indexTree", () => {
	it("lists each folder's children, folders first and then files, each alphabetical", () => {
		const index = indexTree(sourceTree.entries);

		expect(index.children.get("")?.map((entry) => entry.path)).toEqual(["docs", "src", "README.md"]);
		expect(index.children.get("src")?.map((entry) => entry.path)).toEqual(["src/core", "src/index.ts"]);
		expect(readmeIn(index, "")?.path).toBe("README.md");
		expect(readmeIn(index, "src")).toBeUndefined();
	});
});

describe("the rest of the tree's rules", () => {
	it("opens every folder above a path, and finds a file by any words of its path", () => {
		expect(ancestorsOf("src/core/loader.ts")).toEqual(["src", "src/core"]);
		expect(matchingFiles(sourceTree.entries, "core load").map((entry) => entry.path)).toEqual(["src/core/loader.ts"]);
		expect(matchingFiles(sourceTree.entries, "  ")).toEqual([]);
	});

	it("counts lines without a phantom one after the last newline, and sizes in the steps a file manager uses", () => {
		expect([lineCount(""), lineCount("a"), lineCount("a\nb\n")]).toEqual([0, 1, 2]);
		expect([formatBytes(512), formatBytes(2_048), formatBytes(3 * 1024 * 1024)]).toEqual(["512 bytes", "2 kB", "3 MB"]);
	});

	/** A path is part of the address, so a space or a `#` in a file name cannot end it early. */
	it("encodes each part of a path into its route", () => {
		expect(sourceRoute("")).toBe("/source-code");
		expect(sourceRoute("docs/a file#1.md")).toBe("/source-code/docs/a%20file%231.md");
	});
});
