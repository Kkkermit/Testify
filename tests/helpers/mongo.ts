import mongoose from "mongoose";

/** Set by `tests/helpers/mongoGlobal.ts` before any suite is built, so the decision below can be synchronous. */
function testUri(): string | undefined {
	const uri = process.env["MONGO_TEST_URI"];
	return uri === undefined || uri === "" ? undefined : uri;
}

/** A shared server busy with another worker can stall for longer than a test's budget, which is not this suite's doing. */
const SETUP_MS = 60_000;

/** Each worker has a database of its own, so suites in parallel never empty each other's collections. */
export function workerDatabase(workerId: string): string {
	return `testify-test-${workerId}`;
}

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
			await mongoose.connect(uri, { dbName: workerDatabase(process.env["JEST_WORKER_ID"] ?? "1") });
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
		}, SETUP_MS);

		suite();
	});
}
