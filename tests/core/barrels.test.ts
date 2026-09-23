import * as configBarrel from "@config";
import * as coreBarrel from "@core";
import * as databaseBarrel from "@database";
import * as libBarrel from "@lib";
import { embed } from "@lib/discord/embeds.util";
import * as musicBarrel from "@lib/music";
import { musicPanel } from "@lib/music/musicPanel.util";

/** Importing each barrel catches a broken re-export and a cycle that only shows at runtime. */
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

	/** A domain barrel and the module behind it must hand out one object, or a mock of one misses the other. */
	it("hands out the module's own binding from a domain barrel", () => {
		expect(musicBarrel.musicPanel).toBe(musicPanel);
		expect(libBarrel.musicPanel).toBe(musicPanel);
	});

	it("exposes the framework pieces from @core", () => {
		expect(coreBarrel.defineCommand).toBeDefined();
		expect(coreBarrel.loadEverything).toBeDefined();
		expect(coreBarrel.UserFacingError).toBeDefined();
	});
});
