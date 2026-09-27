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
