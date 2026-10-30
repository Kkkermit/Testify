import { readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import mongoose, { type Model } from "mongoose";
import { workerDatabase } from "./mongo";

/** Builds every worker's collections and indexes; run under tsx by `mongoGlobal.ts`, since the schemas import aliases. */

const MODELS = join(__dirname, "..", "..", "src", "database", "models");

async function everyModel(): Promise<Model<unknown>[]> {
	const files = readdirSync(MODELS).filter((file) => file.endsWith(".schema.ts"));
	await Promise.all(
		files.map(async (file) => {
			// A Windows path is read as a URL whose scheme is the drive letter, so it has to be a file URL.
			await import(pathToFileURL(join(MODELS, file)).href);
		}),
	);
	return Object.values(mongoose.models) as Model<unknown>[];
}

async function build(uri: string, workers: number): Promise<void> {
	const models = await everyModel();
	const connection = await mongoose.createConnection(uri).asPromise();

	try {
		// One database at a time, since building them together is the contention this keeps out of the run.
		for (let worker = 1; worker <= workers; worker++) {
			const database = connection.useDb(workerDatabase(String(worker)));
			await Promise.all(
				models.map(async (model) =>
					database.model(model.modelName, model.schema, model.collection.collectionName).syncIndexes(),
				),
			);
		}
	} finally {
		await connection.close();
	}
}

const [uri = "", workers = "1"] = process.argv.slice(2);

build(uri, Number(workers)).catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
