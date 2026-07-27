import mongoose from "mongoose";
import prompts from "prompts";
import { loadEnv } from "@config/env";
import { createLogger } from "@core/logger";
import { connectDatabase, disconnectDatabase } from "@database/connection";

/** Drops every collection. Requires typing the database name to confirm. */
async function main(): Promise<void> {
	const env = loadEnv();
	const logger = createLogger(env.LOG_LEVEL, true);

	await connectDatabase({ uri: env.MONGODB_URI, logger });

	const name = mongoose.connection.name;
	const collections = await mongoose.connection.db?.collections();

	if (!collections || collections.length === 0) {
		console.log(`Database "${name}" has no collections.`);
		await disconnectDatabase();
		return;
	}

	console.log(`Database: ${name}`);
	console.log(`Collections: ${collections.map((collection) => collection.collectionName).join(", ")}`);

	const { confirmation } = await prompts({
		type: "text",
		name: "confirmation",
		message: `This deletes every document. Type "${name}" to continue`,
	});

	if (confirmation !== name) {
		console.log("Cancelled. Nothing was deleted.");
		await disconnectDatabase();
		return;
	}

	for (const collection of collections) {
		await collection.deleteMany({});
		console.log(`Cleared ${collection.collectionName}`);
	}

	await disconnectDatabase();
	console.log("Done.");
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
