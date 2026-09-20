import { MongoMemoryServer } from "mongodb-memory-server";

/**
 * One in-memory MongoDB for the whole run, started before any suite is defined.
 *
 * It has to happen here rather than in a `beforeAll`: whether the database exists decides between `describe`
 * and `describe.skip`, and Jest needs that answer synchronously, while the suite is being built. A suite that
 * only discovers it at run time can do nothing but return early from each test — which reports as passing.
 *
 * The handle lives on `globalThis` because Jest loads setup and teardown through separate module registries,
 * so a module-level variable would be a different one by the time teardown looks for it.
 */
const HANDLE = Symbol.for("testify.test.mongo");

type Holder = typeof globalThis & { [HANDLE]?: MongoMemoryServer };

export default async function setup(): Promise<void> {
	// Only this file may set it, so an inherited value cannot quietly turn the opt-out back on.
	delete process.env["MONGO_TEST_URI"];

	if (process.env["SKIP_DB_TESTS"] === "1") return;

	try {
		const server = await MongoMemoryServer.create();
		(globalThis as Holder)[HANDLE] = server;
		process.env["MONGO_TEST_URI"] = server.getUri();
	} catch (error) {
		// CI sets this, because a green run that never touched the data layer is worse than a red one.
		if (process.env["REQUIRE_DB_TESTS"] === "1") {
			throw new Error("REQUIRE_DB_TESTS is set but no MongoDB could be started.", { cause: error });
		}

		console.warn("\nNo MongoDB here — every database suite will report as skipped rather than as passed.\n");
	}
}

export async function teardown(): Promise<void> {
	await (globalThis as Holder)[HANDLE]?.stop();
}
