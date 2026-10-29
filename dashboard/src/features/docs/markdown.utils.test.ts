import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REQUIRED_VARIABLES } from "@/features/docs/components/ConfigurationTable";
import { PAGES_BY_FILE, PAGES_BY_SECTION } from "@/features/docs/docs.pages";
import {
	alertOf,
	anchorsOf,
	decodeEntities,
	destinationOf,
	headingSlug,
	normalisePath,
	sectionsOf,
	Slugger,
	variablesIn,
	withoutMarkup,
} from "@/features/docs/markdown.utils";

const ROOT = resolve(__dirname, "..", "..", "..", "..");
const read = (file: string): string => readFileSync(resolve(ROOT, file), "utf8");

const context = {
	file: "README.md",
	anchors: new Set(["-quick-start"]),
	pagesByFile: PAGES_BY_FILE,
	pagesBySection: PAGES_BY_SECTION,
	repository: "https://github.com/Kkkermit/Testify",
};

describe("headingSlug", () => {
	/** A link written for GitHub, `#21-decisions-already-made--do-not-relitigate`, has to land on the same heading here. */
	it("builds the anchor GitHub builds", () => {
		expect(headingSlug("21. Decisions already made — do not relitigate")).toBe(
			"21-decisions-already-made--do-not-relitigate",
		);
		expect(headingSlug("💻 Compatibility")).toBe("-compatibility");
		expect(headingSlug("Import aliases and barrels")).toBe("import-aliases-and-barrels");
	});

	it("numbers a repeat the way GitHub does", () => {
		const slugger = new Slugger();
		expect([slugger.slug("Setup"), slugger.slug("Setup"), slugger.slug("Setup")]).toEqual([
			"setup",
			"setup-1",
			"setup-2",
		]);
	});
});

describe("sectionsOf", () => {
	const doc = ["## One", "a", "```md", "## Not a heading", "```", "### Inside", "b", "## Two", "c"].join("\n");

	/** A `##` inside a code sample is text, so it must not end the section it sits in. */
	it("takes a section up to the next heading of its level, past code and subheadings", () => {
		expect(sectionsOf(doc, ["One"])[0]).toBe(
			["## One", "a", "```md", "## Not a heading", "```", "### Inside", "b"].join("\n"),
		);
	});

	it("matches a heading without its emoji or number, and says when one is gone", () => {
		expect(sectionsOf("## 8. Adding a command\nx", ["Adding a command"])[0]).toContain("x");
		expect(sectionsOf(doc, ["Missing"])[0]).toBeNull();
	});
});

describe("destinationOf", () => {
	it("opens a docs page for a file one shows whole, and keeps the anchor", () => {
		expect(destinationOf("docs/hosting.md#-quick-start", context)).toEqual({
			kind: "route",
			to: "/docs/docker#-quick-start",
		});
	});

	/** AGENTS.md is split across pages, so a link to one of its sections finds the page that shows that section. */
	it("opens the page showing a section for a link to that section", () => {
		expect(destinationOf("AGENTS.md#8-adding-a-command", context)).toEqual({
			kind: "route",
			to: "/docs/adding-a-command#8-adding-a-command",
		});
	});

	it("opens any other file in the source browser, read from the linking file's folder", () => {
		expect(destinationOf("src/commands/", context)).toEqual({ kind: "route", to: "/source-code/src/commands" });
		expect(destinationOf("../../.claude/skills/README.md", { ...context, file: "docs/dashboard/guide.md" })).toEqual({
			kind: "route",
			to: "/source-code/.claude/skills/README.md",
		});
	});

	it("stays on the page for one of its own headings, and goes to GitHub for any other", () => {
		expect(destinationOf("#-quick-start", context)).toEqual({ kind: "anchor", id: "-quick-start" });
		expect(destinationOf("#-faq", context)).toEqual({
			kind: "external",
			href: "https://github.com/Kkkermit/Testify/blob/HEAD/README.md#-faq",
		});
		expect(destinationOf("https://discord.com", context)).toEqual({ kind: "external", href: "https://discord.com" });
	});
});

describe("normalisePath", () => {
	it("refuses a path that climbs out of the repository", () => {
		expect(normalisePath("docs/../README.md")).toBe("README.md");
		expect(normalisePath("../outside")).toBeNull();
	});
});

describe("withoutMarkup", () => {
	/** The README's FAQ is `<details>` around a `<summary>`; without this every question vanished with the HTML. */
	it("keeps a collapsed question as a heading", () => {
		expect(
			withoutMarkup("<details>\n<summary><strong>Does it cost money?</strong></summary>\n\nNo.\n\n</details>"),
		).toContain("#### Does it cost money?");
	});
});

describe("decodeEntities and alertOf", () => {
	it("reads entity references back into their characters, and leaves anything else alone", () => {
		expect(decodeEntities("a &amp; b &lt;c&gt; &#x1F600; &unknown;")).toBe("a & b <c> 😀 &unknown;");
	});

	it("recognises GitHub's alert marker and drops it from the text", () => {
		expect(alertOf("[!WARNING]\nCareful.")).toEqual({ kind: "warning", body: "Careful." });
		expect(alertOf("Just a quote.")).toBeNull();
	});
});

describe("the configuration page", () => {
	const variables = variablesIn(read(".env.example"));

	it("reads every variable with the comment above it and the block it sits in", () => {
		expect(variables.find((variable) => variable.name === "DISCORD_TOKEN")?.description).toMatch(/Developer Portal/);
		expect(variables.find((variable) => variable.name === "SITE_ENABLED")?.group).toBe("The website");
	});

	/** The page is the place somebody learns what to set, so a variable the bot reads and the page leaves out is a gap. */
	it("lists every variable the bot reads", () => {
		const schema = read("src/config/env.ts");
		const declared = [...schema.matchAll(/^\t([A-Z][A-Z0-9_]+):/gm)].map(([, name]) => name);

		expect(declared.length).toBeGreaterThan(20);
		// The npm scripts set NODE_ENV, which is why the templates leave it out too.
		const missing = declared.filter(
			(name) => name !== "NODE_ENV" && !variables.some((variable) => variable.name === name),
		);
		expect(missing).toEqual([]);
	});

	it("marks as required exactly the variables env.ts requires", () => {
		const schema = read("src/config/env.ts");
		const block = schema.slice(schema.indexOf("// Required."), schema.indexOf("// Optional."));

		expect([...block.matchAll(/^\t([A-Z][A-Z0-9_]+):/gm)].map(([, name]) => name)).toEqual([...REQUIRED_VARIABLES]);
	});
});

describe("anchorsOf", () => {
	it("lists a file's anchors in order", () => {
		expect(anchorsOf("# A\n## B\n## B")).toEqual(["a", "b", "b-1"]);
	});
});
