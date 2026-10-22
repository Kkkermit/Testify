import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "dotenv";
import mongoose from "mongoose";
import prompts from "prompts";
import { EnvError, type EnvFile, envFile } from "@config/env";
import { createLogger } from "@core/logger";
import { repoRoot } from "@core/paths";
import { badge, painter, stepLine } from "@core/terminal";
import { connectDatabase, disconnectDatabase } from "@database/connection";
import { describeDatabase, printStartupFailure } from "@lib/bot/startup.util";

/** Empties the development or the production database, all of it or the models picked, once its name is typed back. */

const paint = painter();

export type Target = "development" | "production";

export const TARGET_FILES: Record<Target, EnvFile["name"]> = {
	development: ".env.development",
	production: ".env",
};

/** `--dev` or `--prod` answers the question; neither, or both, leaves it to be asked. */
export function targetFromArgs(argv: readonly string[]): Target | null {
	const dev = argv.includes("--dev");
	if (dev === argv.includes("--prod")) return null;
	return dev ? "development" : "production";
}

const SAME_HOST: Record<string, string> = { "127.0.0.1": "localhost", "[::1]": "localhost" };

/** Every host and the database a connection string names, credentials dropped, written the same way each time. */
export function databaseKey(uri: string): string | null {
	const match = /^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)(?:\/([^?]*))?/i.exec(uri.trim());
	if (match === null) return null;

	const [, hosts = "", name = ""] = match;
	const servers = hosts
		.toLowerCase()
		.split(",")
		.map((host) => host.trim().replace(/:27017$/, ""))
		.map((host) => SAME_HOST[host] ?? host)
		.sort();

	// MongoDB uses "test" when the string names no database, and refuses two names that differ only by case.
	return `${servers.join(",")}/${name === "" ? "test" : name.toLowerCase()}`;
}

export function sameDatabase(a: string, b: string): boolean {
	const key = databaseKey(a);
	return key !== null && key === databaseKey(b);
}

/** The connection string in one env file, read without loading the file into this process. */
function uriIn(file: EnvFile): string | null {
	if (!file.exists) return null;
	const uri = parse(readFileSync(file.path, "utf8")).MONGODB_URI?.trim() ?? "";
	return uri === "" ? null : uri;
}

function cancelled(): void {
	console.log(`  ${paint.green("Cancelled.")} Nothing was deleted.`);
}

async function chooseTarget(): Promise<Target | null> {
	const { target } = await prompts({
		type: "select",
		name: "target",
		message: "Which database should be wiped?",
		choices: [
			{ title: "Development", description: `the MONGODB_URI in ${TARGET_FILES.development}`, value: "development" },
			{ title: "Production", description: `the MONGODB_URI in ${TARGET_FILES.production}`, value: "production" },
		],
		initial: 0,
	});

	return (target as Target | undefined) ?? null;
}

type Collection = mongoose.mongo.Collection;

/** The export and schema file behind a collection, so a row names the model the code calls it by. */
export interface ModelOwner {
	name: string;
	file: string;
}

function isModel(value: unknown): value is mongoose.Model<unknown> {
	return typeof value === "function" && (value as { prototype: unknown }).prototype instanceof mongoose.Model;
}

/** Which exported model, in which schema file, writes each collection. */
export function modelOwners(modules: Record<string, Record<string, unknown>>): Map<string, ModelOwner> {
	const owners = new Map<string, ModelOwner>();

	for (const [file, exports] of Object.entries(modules)) {
		for (const [name, value] of Object.entries(exports)) {
			if (isModel(value)) owners.set(value.collection.collectionName, { name, file });
		}
	}

	return owners;
}

export async function loadModelOwners(
	dir = join(repoRoot(), "src", "database", "models"),
): Promise<Map<string, ModelOwner>> {
	const files = readdirSync(dir)
		.filter((file) => file.endsWith(".schema.ts"))
		.sort();
	const modules = await Promise.all(
		files.map(async (file) => [file, (await import(join(dir, file))) as Record<string, unknown>] as const),
	);

	return modelOwners(Object.fromEntries(modules));
}

function documents(count: number): string {
	return `${count.toLocaleString("en-GB")} ${count === 1 ? "document" : "documents"}`;
}

/** One row of the picker: the model first, since that is what the schema files call it. */
export function collectionTitle(collection: string, count: number, owner: ModelOwner | undefined): string {
	if (owner === undefined) return `${collection} · no model, left by an older version · ${documents(count)}`;
	return `${owner.name} · ${collection} in ${owner.file} · ${documents(count)}`;
}

async function chooseCollections(collections: Collection[], owners: Map<string, ModelOwner>): Promise<Collection[]> {
	const counts = await Promise.all(collections.map((collection) => collection.estimatedDocumentCount()));
	const total = counts.reduce((sum, count) => sum + count, 0);

	const { scope } = await prompts({
		type: "select",
		name: "scope",
		message: "What should be wiped?",
		choices: [
			{ title: "Choose models…", description: "pick them from a list", value: "some" },
			{
				title: "Everything",
				description: `all ${String(collections.length)} collections, ${documents(total)}`,
				value: "all",
			},
		],
		initial: 0,
	});

	if (scope === "all") return collections;
	if (scope !== "some") return [];

	const rows = collections
		.map((collection, index) => {
			const owner = owners.get(collection.collectionName);
			return { collection, owner, title: collectionTitle(collection.collectionName, counts[index] ?? 0, owner) };
		})
		// Models in name order, then anything no model owns.
		.sort((a, b) => Number(a.owner === undefined) - Number(b.owner === undefined) || a.title.localeCompare(b.title));

	const { picked } = await prompts({
		type: "multiselect",
		name: "picked",
		message: "Which should be emptied?",
		choices: rows.map((row) => ({ title: row.title, value: row.collection.collectionName })),
		hint: "Space picks one, A picks all, Enter carries on",
		instructions: false,
		min: 1,
	});

	const names = (picked as string[] | undefined) ?? [];
	return rows.map((row) => row.collection).filter((collection) => names.includes(collection.collectionName));
}

async function wipe(target: Target, file: EnvFile, uri: string): Promise<void> {
	const name = mongoose.connection.name;
	const collections = (await mongoose.connection.db?.collections()) ?? [];
	const heading =
		target === "production" ? badge("PRODUCTION", "error", paint) : badge("DEVELOPMENT", "warning", paint);

	console.log(`\n  ${heading} ${paint.bold(describeDatabase(uri))} ${paint.dim(`from ${file.name}`)}\n`);

	if (collections.length === 0) {
		console.log(`  Database "${name}" has no collections.`);
		return;
	}

	const chosen = await chooseCollections(collections, await loadModelOwners());
	if (chosen.length === 0) return cancelled();

	const scope =
		chosen.length === collections.length
			? "every collection"
			: `${String(chosen.length)} of ${String(collections.length)} collections`;
	console.log(`\n  ${badge("DESTRUCTIVE", "error", paint)} ${paint.bold(`This empties ${scope} in ${name}.`)}\n`);

	const { confirmation } = await prompts({
		type: "text",
		name: "confirmation",
		message: `This deletes every document in them, in ${target}. Type "${name}" to continue`,
	});

	if (confirmation !== name) return cancelled();

	// One at a time, so a failure part-way leaves a list of exactly what was emptied.
	for (const collection of chosen) {
		await collection.deleteMany({});
		console.log(stepLine("done", "Emptied", collection.collectionName, undefined, paint));
	}

	console.log(`\n  ${paint.bold("Done.")}`);
}

async function main(): Promise<void> {
	const target = targetFromArgs(process.argv) ?? (await chooseTarget());
	if (target === null) return cancelled();

	const file = envFile(TARGET_FILES[target]);
	const uri = uriIn(file);
	if (uri === null) throw new EnvError(file, [{ key: "MONGODB_URI", missing: true, message: "is not set" }]);

	const production = uriIn(envFile(TARGET_FILES.production));
	if (target === "development" && production !== null && sameDatabase(uri, production)) {
		console.log(
			`\n  ${badge("STOPPED", "error", paint)} ${paint.bold(`${file.name} points at the production database.`)}\n`,
		);
		console.log(`  Wiping it would empty ${describeDatabase(uri)}, which ${TARGET_FILES.production} uses too.`);
		console.log(
			`  Give the development bot its own database, e.g. ${paint.bold("mongodb://localhost:27017/testify-dev")}`,
		);
		process.exitCode = 1;
		return;
	}

	await connectDatabase({ uri, logger: createLogger("info", true) });

	try {
		await wipe(target, file, uri);
	} finally {
		await disconnectDatabase();
	}
}

if (require.main === module) {
	main().catch((error: unknown) => {
		printStartupFailure(error);
		process.exitCode = 1;
	});
}
