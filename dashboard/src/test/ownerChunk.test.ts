import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { everyModule } from "./sourceFiles";

/**
 * The owner console's code is served only to owners, which works only while it stays in a chunk of its own; one import
 * from anywhere else pulls it into a file every visitor loads.
 */

const SRC = resolve(__dirname, "..");
const OWNER_IMPORT = /from\s+["']@\/features\/owner\/|import\(\s*["']@\/features\/owner\//;

describe("the owner console's chunk", () => {
	it("has files to check, so a broken pattern cannot pass vacuously", () => {
		expect(everyModule().length).toBeGreaterThan(50);
	});

	it("is reached from outside the owner feature by nothing but the router's lazy import", () => {
		const outside = everyModule()
			.filter((path) => !path.includes(`${resolve(SRC, "features", "owner")}`))
			.filter((path) => OWNER_IMPORT.test(readFileSync(path, "utf8")))
			.map((path) => path.slice(SRC.length + 1));

		expect(outside).toEqual(["routes.tsx"]);
	});

	it("is imported lazily by the router, never statically", () => {
		const routes = readFileSync(resolve(SRC, "routes.tsx"), "utf8");

		expect(routes).toMatch(/import\(\s*"@\/features\/owner\/OwnerPage"\s*\)/);
		expect(routes).not.toMatch(/from\s+["']@\/features\/owner\//);
	});
});
