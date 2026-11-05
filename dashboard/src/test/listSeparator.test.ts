import { everyModule, offenders } from "./sourceFiles";

/** Japanese separates a list with 、, so no module may join one with a literal comma. */
describe("lists", () => {
	it("are joined with the translated separator", () => {
		expect(offenders(/\.join\(\s*["'`], +["'`]\s*\)/, undefined, everyModule())).toEqual([]);
	});
});
