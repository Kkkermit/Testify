import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { filesUnder, missingFrom, reactVersionsIn, schemeProblem } from "../../scripts/verifyBundle";

/**
 * The guard that catches two React copies in one bundle. It has to stay narrow: a false positive fails a build
 * with no bug behind it, and a false negative ships a dashboard that cannot mount.
 */
describe("reactVersionsIn", () => {
	it("finds the version React exports beside its hooks", () => {
		const code = "e.useTransition=function(){return w.H.useTransition()},e.version=`19.2.8`";

		expect(reactVersionsIn(code)).toEqual(["19.2.8"]);
	});

	it("finds the version in the DevTools renderer descriptor", () => {
		expect(reactVersionsIn("var Rp={bundleType:0,version:`19.2.8`,rendererPackageName:`react-dom`}")).toEqual([
			"19.2.8",
		]);
	});

	/** The real bug: React 18 hoisted beside the dashboard's 19, so every hook reads a null dispatcher. */
	it("reports both when two copies are bundled", () => {
		const code = [
			"e.useTransition=function(){return w.H.useTransition()},e.version=`19.2.8`",
			"t.useSyncExternalStore=function(){},t.version=`18.3.1`",
		].join("\n");

		expect(reactVersionsIn(code)).toEqual(["18.3.1", "19.2.8"]);
	});

	/** dompurify writes its own version the same way, and counting it failed a build with nothing wrong. */
	it("ignores another package that exports a semver the same way", () => {
		const code = "let t=e=>Uy(e);if(t.version=`3.4.13`,t.removed=[],!e||!e.document)";

		expect(reactVersionsIn(code)).toEqual([]);
	});

	it("ignores a version far from anything React owns", () => {
		expect(reactVersionsIn(`${"x".repeat(400)}useTransition${"y".repeat(400)}version="1.2.3"`)).toEqual([]);
	});

	it("finds nothing in a bundle with no version strings at all", () => {
		expect(reactVersionsIn("const a = 1;")).toEqual([]);
	});
});

/**
 * Both failures this catches are invisible until the CSS is built: development serves `light-dark()` untouched,
 * so the theme samples and the backdrop's palette are correct locally and wrong in production.
 */
describe("schemeProblem", () => {
	it("passes a stylesheet that left the function to the browser", () => {
		expect(schemeProblem(":root{--color-card:light-dark(#ffffff,#12121c)}")).toBeNull();
	});

	/** A token substituted at `:root` cannot be changed by a nested `color-scheme`, which is the whole mechanism. */
	it("fails a stylesheet where the function was compiled into variables", () => {
		const css = ":root{--color-card:var(--lightningcss-light,#ffffff)var(--lightningcss-dark,#12121c)}";

		expect(schemeProblem(css)).toMatch(/compiled into variables/);
	});

	it("fails a stylesheet that lost the function altogether", () => {
		expect(schemeProblem(":root{--color-card:#12121c}")).toMatch(/one theme/);
	});
});

/**
 * `robots.txt` and `.well-known/security.txt` are copied into the build rather than imported by anything, so
 * nothing else notices if they stop arriving — and neither does anyone else until a crawler or a reporter
 * looks for one.
 */
describe("the public tree", () => {
	let source: string;
	let build: string;

	beforeEach(() => {
		source = mkdtempSync(join(tmpdir(), "testify-public-"));
		build = mkdtempSync(join(tmpdir(), "testify-built-"));

		for (const root of [source, build]) {
			mkdirSync(join(root, ".well-known"));
			writeFileSync(join(root, "robots.txt"), "User-agent: *\n");
			writeFileSync(join(root, ".well-known", "security.txt"), "Contact: mailto:a@b.c\n");
		}
	});

	afterEach(() => {
		for (const root of [source, build]) rmSync(root, { recursive: true, force: true });
	});

	it("lists every file, including the ones in a dotted directory", () => {
		expect(filesUnder(source).sort()).toEqual([join(".well-known", "security.txt"), "robots.txt"]);
	});

	it("lists nothing for a directory that is not there", () => {
		expect(filesUnder(join(source, "nope"))).toEqual([]);
	});

	it("reports nothing when the build carries them all", () => {
		expect(missingFrom(build, filesUnder(source))).toEqual([]);
	});

	it("names the file a build left behind", () => {
		rmSync(join(build, ".well-known", "security.txt"));

		expect(missingFrom(build, filesUnder(source))).toEqual([join(".well-known", "security.txt")]);
	});
});
