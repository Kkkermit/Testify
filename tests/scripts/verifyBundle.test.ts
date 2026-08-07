import { reactVersionsIn } from "../../scripts/verifyBundle";

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
