import mongoose from "mongoose";

/** Set by `tests/helpers/mongoGlobal.ts` before any suite is built, so the decision below can be synchronous. */
function testUri(): string | undefined {
	const uri = process.env["MONGO_TEST_URI"];
	return uri === undefined || uri === "" ? undefined : uri;
}

/** A worker's first suite builds every index, and on a busy Windows runner that can outlast a test's budget. */
const SETUP_MS = 60_000;

export function mongoAvailable(): boolean {
	return testUri() !== undefined;
}

/**
 * `describe` when a database is available and `describe.skip` when not, so a missing one shows as skipped; each worker
 * gets its own database.
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
			// Mongoose builds indexes in the background, and a test racing two writes needs the unique one already there.
			await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));
		}, SETUP_MS);

		// The database outlives the suite, so the next one in this worker finds its indexes already built.
		afterAll(async () => {
			await mongoose.disconnect();
		});

		// Only this suite's models can reach a collection, so only theirs need emptying.
		beforeEach(async () => {
			await Promise.all(Object.values(mongoose.models).map(async (model) => model.collection.deleteMany({})));
		});

		suite();
	});
}
