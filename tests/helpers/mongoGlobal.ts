import { spawn } from "node:child_process";
import { join } from "node:path";
import type { GlobalConfig } from "jest";
import { MongoMemoryServer } from "mongodb-memory-server";

/**
 * One in-memory MongoDB for the run, started before suites are built so `describeWithMongo` can decide synchronously;
 * the handle is on `globalThis` because teardown loads in a separate registry.
 */
const HANDLE = Symbol.for("testify.test.mongo");

type Holder = typeof globalThis & { [HANDLE]?: MongoMemoryServer };

/**
 * Every worker's collections and indexes, built before the first suite: on a busy Windows runner, building them while
 * other workers ran tests stalled the shared server past a test's budget.
 */
async function buildWorkerDatabases(uri: string, workers: number): Promise<void> {
	const builder = join(__dirname, "buildTestDatabases.ts");
	const child = spawn(process.execPath, [require.resolve("tsx/cli"), builder, uri, String(workers)], {
		stdio: ["ignore", "ignore", "pipe"],
		windowsHide: true,
	});

	let complaint = "";
	child.stderr.setEncoding("utf8");
	child.stderr.on("data", (chunk: string) => (complaint += chunk));

	await new Promise<void>((resolve, reject) => {
		child.once("error", reject);
		child.once("close", (code) =>
			code === 0 ? resolve() : reject(new Error(complaint.trim() || `the builder exited ${String(code)}`)),
		);
	});
}

export default async function setup(globalConfig: GlobalConfig): Promise<void> {
	// Only this file may set it, so an inherited value cannot quietly turn the opt-out back on.
	delete process.env["MONGO_TEST_URI"];

	if (process.env["SKIP_DB_TESTS"] === "1") return;

	let uri: string;
	try {
		const server = await MongoMemoryServer.create();
		(globalThis as Holder)[HANDLE] = server;
		uri = server.getUri();
		process.env["MONGO_TEST_URI"] = uri;
	} catch (error) {
		// CI sets this, because a green run that never touched the data layer is worse than a red one.
		if (process.env["REQUIRE_DB_TESTS"] === "1") {
			throw new Error("REQUIRE_DB_TESTS is set but no MongoDB could be started.", { cause: error });
		}

		console.warn("\nNo MongoDB here — every database suite will report as skipped rather than as passed.\n");
		return;
	}

	// A local run of one file would pay for every worker's database, so only a CI run, which runs them all, builds ahead.
	if (!globalConfig.ci) return;

	try {
		await buildWorkerDatabases(uri, globalConfig.maxWorkers);
	} catch (error) {
		// Each suite would still build what it uses, but CI would then be back to stalling, so CI hears about it.
		if (process.env["REQUIRE_DB_TESTS"] === "1") {
			throw new Error("The test databases could not be built ahead of the run.", { cause: error });
		}

		console.warn("\nThe test databases could not be built ahead of the run; each suite will build its own.\n", error);
	}
}

export async function teardown(): Promise<void> {
	await (globalThis as Holder)[HANDLE]?.stop();
}
