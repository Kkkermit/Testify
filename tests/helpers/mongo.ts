import mongoose from "mongoose";

/** Set by `tests/helpers/mongoGlobal.ts` before any suite is built, so the decision below can be synchronous. */
function testUri(): string | undefined {
	const uri = process.env["MONGO_TEST_URI"];
	return uri === undefined || uri === "" ? undefined : uri;
}

export function mongoAvailable(): boolean {
	return testUri() !== undefined;
}

/**
 * `describe` for a suite that needs a real database, and `describe.skip` when there is none.
 *
 * Skipping at the suite level is the whole point. The previous shape returned early from each test instead, so
 * a run without MongoDB reported 41 passing tests that had asserted nothing — and a mutation replacing an
 * atomic `$inc` with `$set` survived all of them. A skipped suite says so in the summary.
 *
 * Each worker connects to its own database, because Jest runs suites in parallel processes against this one
 * server and the wipe below would otherwise clear a sibling's fixtures mid-test.
 */
export function describeWithMongo(name: string, suite: () => void): void {
	const uri = testUri();

	if (uri === undefined) {
		describe.skip(name, suite);
		return;
	}

	describe(name, () => {
		beforeAll(async () => {
			await mongoose.connect(uri, { dbName: `testify-test-${process.env["JEST_WORKER_ID"] ?? "1"}` });
		});

		afterAll(async () => {
			await mongoose.connection.dropDatabase();
			await mongoose.disconnect();
		});

		beforeEach(async () => {
			const collections = await mongoose.connection.db?.collections();
			for (const collection of collections ?? []) await collection.deleteMany({});
		});

		suite();
	});
}
