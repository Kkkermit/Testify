import { buildBackup, placeKind, planBackup, backupDocument } from "@testify/shared";

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

describe("backupDocument", () => {
	/** A file is whatever somebody saved, so no key in it may reach an object's prototype. */
	it("refuses anything that is not a backup or names a place by something but an id, and drops a prototype key", () => {
		const base = buildBackup("S", {}, source);
		expect(backupDocument.safeParse({ kind: "other" }).success).toBe(false);
		expect(backupDocument.safeParse({ ...base, channels: { general: "x" } }).success).toBe(false);
		expect(backupDocument.safeParse({ ...base, sections: { "starboard.update": { "x-y": 1 } } }).success).toBe(false);

		const parsed = backupDocument.parse({
			...base,
			channels: JSON.parse('{"__proto__":{"polluted":true}}') as unknown,
		});
		expect(Object.hasOwn(parsed.channels, "__proto__")).toBe(false);
		expect(({} as Record<string, unknown>).polluted).toBeUndefined();
	});

	it("reads a field as a channel or a role by the reach check's own rule", () => {
		expect([
			placeKind("lobbyChannelId"),
			placeKind("categoryId"),
			placeKind("djRoleIds"),
			placeKind("threshold"),
		]).toEqual(["channel", "channel", "role", null]);
	});
});
