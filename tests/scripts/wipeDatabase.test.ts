import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import mongoose from "mongoose";
import {
	collectionTitle,
	databaseKey,
	loadModelOwners,
	modelOwners,
	sameDatabase,
	TARGET_FILES,
	targetFromArgs,
} from "../../scripts/wipeDatabase";

describe("targetFromArgs", () => {
	it("reads --dev and --prod", () => {
		expect(targetFromArgs(["node", "wipe", "--dev"])).toBe("development");
		expect(targetFromArgs(["node", "wipe", "--prod"])).toBe("production");
	});

	/** Guessing between the two would be the one wrong answer, so both, or neither, asks. */
	it("asks when given neither or both", () => {
		expect(targetFromArgs(["node", "wipe"])).toBeNull();
		expect(targetFromArgs(["node", "wipe", "--dev", "--prod"])).toBeNull();
	});
});

describe("TARGET_FILES", () => {
	it("reads development from the file npm run dev reads, and production from the one npm start reads", () => {
		expect(TARGET_FILES).toEqual({ development: ".env.development", production: ".env" });
	});
});

describe("databaseKey", () => {
	it("leaves the credentials and options out", () => {
		const key = databaseKey("mongodb+srv://admin:hunter2@Cluster0.example.mongodb.net/Testify?retryWrites=true");

		expect(key).toBe("cluster0.example.mongodb.net/testify");
		expect(key).not.toContain("hunter2");
	});

	it("is null for something that is not a connection string", () => {
		expect(databaseKey("not a uri")).toBeNull();
	});
});

describe("sameDatabase", () => {
	/** A development wipe that reached production's database would empty the live bot. */
	it("sees one database however the connection string is written", () => {
		expect(
			sameDatabase("mongodb://localhost/testify", "mongodb://user:pw@127.0.0.1:27017/testify?authSource=admin"),
		).toBe(true);
		expect(sameDatabase("mongodb://a:1,b:2/testify", "mongodb://b:2,a:1/testify")).toBe(true);
		expect(sameDatabase("mongodb://localhost", "mongodb://localhost/test")).toBe(true);
		expect(sameDatabase("mongodb://localhost/Testify", "mongodb://localhost/testify")).toBe(true);
	});

	it("tells a separate database on the same server apart", () => {
		expect(sameDatabase("mongodb://localhost/testify", "mongodb://localhost/testify-dev")).toBe(false);
		expect(
			sameDatabase(
				"mongodb+srv://u:p@cluster0.example.mongodb.net/testify",
				"mongodb+srv://u:p@cluster1.example.mongodb.net/testify",
			),
		).toBe(false);
	});

	it("never matches a string it cannot read", () => {
		expect(sameDatabase("not a uri", "not a uri")).toBe(false);
	});
});

describe("modelOwners", () => {
	it("names a collection by the export that writes it, and ignores everything else exported beside it", () => {
		const Note = mongoose.model("wipeNote", new mongoose.Schema({ text: String }));
		const owners = modelOwners({ "note.schema.ts": { Note, NOTE_LIMIT: 5, noteSchema: Note.schema } });

		expect([...owners]).toEqual([["wipenotes", { name: "Note", file: "note.schema.ts" }]]);
	});
});

describe("loadModelOwners", () => {
	const dir = join(__dirname, "../../src/database/models");

	/** A model the picker cannot name would show up as "no model", and look safe to wipe as leftovers. */
	it("finds every model declared in the schema files", async () => {
		const declared = readdirSync(dir)
			.filter((file) => file.endsWith(".schema.ts"))
			.reduce((sum, file) => sum + (readFileSync(join(dir, file), "utf8").match(/= model</g) ?? []).length, 0);

		const owners = await loadModelOwners(dir);

		expect(owners.size).toBe(declared);
		expect(owners.get("warntutorials")).toEqual({ name: "Warnings", file: "moderation.schema.ts" });
		expect(owners.get("economies")).toEqual({ name: "Economy", file: "economy.schema.ts" });
	});
});

describe("collectionTitle", () => {
	it("leads with the model, then the collection, its schema file and how much is in it", () => {
		expect(collectionTitle("warntutorials", 1204, { name: "Warnings", file: "moderation.schema.ts" })).toBe(
			"Warnings · warntutorials in moderation.schema.ts · 1,204 documents",
		);
	});

	it("says when a collection belongs to no model any more", () => {
		expect(collectionTitle("oldthings", 1, undefined)).toBe(
			"oldthings · no model, left by an older version · 1 document",
		);
	});
});
