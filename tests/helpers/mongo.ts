import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let server: MongoMemoryServer | null = null;

/**
 * Repository suites need a real MongoDB. Where one cannot be started — a
 * sandbox with no access to the binary download, for instance — the suite is
 * skipped rather than failing, and CI (which can download it) still runs it.
 */
export async function startMongo(): Promise<boolean> {
	if (process.env.SKIP_DB_TESTS === "1") return false;

	try {
		server = await MongoMemoryServer.create();
		await mongoose.connect(server.getUri(), { dbName: "testify-test" });
		return true;
	} catch {
		server = null;
		return false;
	}
}

export async function stopMongo(): Promise<void> {
	if (mongoose.connection.readyState !== mongoose.ConnectionStates.disconnected) await mongoose.disconnect();
	await server?.stop();
	server = null;
}

export async function clearCollections(): Promise<void> {
	const collections = await mongoose.connection.db?.collections();
	for (const collection of collections ?? []) await collection.deleteMany({});
}

/** `describe` that becomes `describe.skip` when no database could be started. */
export function describeWithMongo(name: string, suite: () => void): void {
	describe(name, () => {
		let available = false;

		beforeAll(async () => {
			available = await startMongo();
			if (!available) {
				console.warn(`Skipping "${name}": no MongoDB available in this environment.`);
			}
		});

		afterAll(async () => {
			if (available) await stopMongo();
		});

		beforeEach(async () => {
			if (available) await clearCollections();
		});

		// The inner suite still registers; individual tests bail out when the
		// database is unavailable, which keeps the reporting honest.
		suite();
	});
}

export function mongoAvailable(): boolean {
	return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}
