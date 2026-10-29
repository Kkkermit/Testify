import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DOC_FILES, DOC_PAGES } from "@/features/docs/docs.pages";
import { sectionsOf } from "@/features/docs/markdown.utils";

const ROOT = resolve(__dirname, "..", "..", "..", "..");

describe("the docs pages", () => {
	/** A heading renamed in the README or AGENTS.md would otherwise leave a page silently empty. */
	it("finds every section a page names, in the file it names", () => {
		const missing = DOC_PAGES.flatMap((page) =>
			page.kind !== "markdown"
				? []
				: page.sources.flatMap((source) => {
						const text = readFileSync(resolve(ROOT, source.file), "utf8");
						const found = sectionsOf(text, source.sections ?? []);
						return (source.sections ?? [])
							.filter((_, index) => found[index] === null)
							.map((name) => `${page.slug}: ${source.file} › ${name}`);
					}),
		);

		expect(missing).toEqual([]);
	});

	it("reads only files that exist, and gives every page its own address", () => {
		for (const file of DOC_FILES) expect(readFileSync(resolve(ROOT, file), "utf8").length).toBeGreaterThan(0);
		expect(new Set(DOC_PAGES.map((page) => page.slug)).size).toBe(DOC_PAGES.length);
	});
});
