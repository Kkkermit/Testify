import mongoose from "mongoose";
import prompts from "prompts";
import { loadEnv } from "@config/env";
import { createLogger } from "@core/logger";
import { badge, painter, stepLine } from "@core/terminal";
import { connectDatabase, disconnectDatabase } from "@database/connection";
import { printStartupFailure } from "@lib/bot/startup.util";

const paint = painter();

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

	console.log(
		`\n  ${badge("DESTRUCTIVE", "error", paint)} ${paint.bold(`This empties every collection in ${name}.`)}\n`,
	);
	console.log(`  ${paint.dim(collections.map((collection) => collection.collectionName).join(", "))}\n`);

	const { confirmation } = await prompts({
		type: "text",
		name: "confirmation",
		message: `This deletes every document. Type "${name}" to continue`,
	});

	if (confirmation !== name) {
		console.log(`  ${paint.green("Cancelled.")} Nothing was deleted.`);
		await disconnectDatabase();
		return;
	}

	for (const collection of collections) {
		await collection.deleteMany({});
		console.log(stepLine("done", "Cleared", collection.collectionName, undefined, paint));
	}

	await disconnectDatabase();
	console.log(`\n  ${paint.bold("Done.")}`);
}

main().catch((error: unknown) => {
	printStartupFailure(error);
	process.exitCode = 1;
});
