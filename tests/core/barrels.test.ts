import * as configBarrel from "@config";
import * as coreBarrel from "@core";
import * as databaseBarrel from "@database";
import * as libBarrel from "@lib";
import { embed } from "@lib/embeds";

/**
 * Importing a barrel pulls in every module behind it, so this catches both a
 * broken re-export and an import cycle that only shows up at runtime.
 */
describe("the directory barrels", () => {
	it.each([
		["@config", configBarrel],
		["@core", coreBarrel],
		["@lib", libBarrel],
		["@database", databaseBarrel],
	])("%s loads and exports something", (_name, barrel: Record<string, unknown>) => {
		expect(Object.keys(barrel).length).toBeGreaterThan(0);
	});

	it("re-exports the same binding the module does", () => {
		expect(libBarrel.embed).toBe(embed);
	});

	it("exposes the framework pieces from @core", () => {
		expect(coreBarrel.defineCommand).toBeDefined();
		expect(coreBarrel.loadEverything).toBeDefined();
		expect(coreBarrel.UserFacingError).toBeDefined();
	});
});
