import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let server: MongoMemoryServer | null = null;

/**
 * Repository suites need a real MongoDB. Where one cannot be started — a
 * sandbox with no access to the binary download, for instance — the suite is
 * skipped rather than failing, and CI still runs it.
 */
export async function startMongo(): Promise<boolean> {
	if (process.env["SKIP_DB_TESTS"] === "1") return false;

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

export function mongoAvailable(): boolean {
	return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}

/** `describe` that skips itself when no database could be started. */
export function describeWithMongo(name: string, suite: () => void): void {
	describe(name, () => {
		let available = false;

		beforeAll(async () => {
			available = await startMongo();
			if (!available) console.warn(`Skipping "${name}": no MongoDB available here.`);
		});

		afterAll(async () => {
			if (available) await stopMongo();
		});

		beforeEach(async () => {
			if (!available) return;
			const collections = await mongoose.connection.db?.collections();
			for (const collection of collections ?? []) await collection.deleteMany({});
		});

		suite();
	});
}
