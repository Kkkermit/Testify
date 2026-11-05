import { RESTORABLE, restorableFields, restoreOf, sameValue, stillAsLeft } from "@testify/shared";

const CHANNEL = "400000000000000001";
const OTHER = "400000000000000002";

describe("restoreOf", () => {
	/** Sending back a field this change did not touch would undo whatever changed it since. */
	it("puts back only the fields the change altered, from the values it replaced", () => {
		const before = { enabled: true, channelId: CHANNEL, message: "Hi {user}", style: "card" };
		const after = { ...before, message: "Welcome {user}" };

		expect(restoreOf("welcome.update", before, after)).toEqual({
			action: "welcome.update",
			put: { message: "Hi {user}" },
			expect: { message: "Welcome {user}" },
		});
	});

	it("offers nothing it could not send back as it is", () => {
		const cases: [string, unknown, unknown][] = [
			["an action nobody can put back", { enabled: true }, { enabled: false }],
			["a record with no before", undefined, { enabled: false }],
			["a change that changed nothing", { enabled: true }, { enabled: true }],
			["a field only one side holds", { enabled: true }, { channelId: CHANNEL }],
		];
		const offered = cases
			.filter(([name, before, after]) =>
				restoreOf(name.startsWith("an action") ? "member.kick" : "welcome.update", before, after),
			)
			.map(([name]) => name);

		expect(offered).toEqual([]);
	});

	/** The lottery's channel cannot be cleared, so a change that set the first one has nothing valid to go back to. */
	it("offers nothing when the old values are a write the route would refuse", () => {
		expect(restoreOf("lottery.update", { announcementChannelId: null }, { announcementChannelId: CHANNEL })).toBeNull();
	});

	it("never sends a field that acts rather than stores", () => {
		expect(RESTORABLE["verification.update"].fields).not.toContain("publish");
		expect(RESTORABLE["settings.counting"].fields).not.toContain("reset");
	});
});

describe("stillAsLeft", () => {
	const restore = restoreOf(
		"starboard.update",
		{ threshold: 3, channelId: CHANNEL },
		{ threshold: 5, channelId: CHANNEL },
	);

	/** A later change, from here or from a command in Discord, is not undone without anybody seeing it. */
	it("is false once somebody has changed the field since", () => {
		expect(restore).not.toBeNull();
		expect(stillAsLeft(restore!, { threshold: 5, channelId: OTHER, canSend: true })).toBe(true);
		expect(stillAsLeft(restore!, { threshold: 7, channelId: CHANNEL })).toBe(false);
		expect(stillAsLeft(restore!, {})).toBe(false);
	});

	it("reads a setting that sits inside a larger document", () => {
		const prefix = restoreOf("settings.prefix", { prefix: "t?" }, { prefix: "!" });

		expect(stillAsLeft(prefix!, { prefix: { prefix: "!", enabled: true }, counting: {} })).toBe(true);
		expect(restorableFields("settings.prefix", { prefix: { prefix: "!", enabled: true } })).toEqual({
			prefix: "!",
			enabled: true,
		});
	});
});

describe("sameValue", () => {
	it("compares by value, ignoring key order and keeping list order", () => {
		expect(sameValue({ a: 1, b: [1, 2] }, { b: [1, 2], a: 1 })).toBe(true);
		expect(sameValue([1, 2], [2, 1])).toBe(false);
		expect(sameValue({ a: 1 }, { a: 1, b: undefined })).toBe(false);
		expect(sameValue(null, {})).toBe(false);
	});
});

describe("RESTORABLE", () => {
	/** A field the schema does not know is one a put-back would send and the route would silently drop. */
	it("names only fields its route's schema accepts", () => {
		const unknown = Object.entries(RESTORABLE).flatMap(([action, entry]) => {
			const shape = Object.keys((entry.schema as unknown as { shape?: object }).shape ?? schemaShape(entry.schema));
			return entry.fields.filter((field) => !shape.includes(field)).map((field) => `${action}.${field}`);
		});

		expect(unknown).toEqual([]);
	});
});

function schemaShape(schema: unknown): object {
	const inner = (schema as { def?: { in?: unknown; schema?: unknown } }).def;
	const next = inner?.in ?? inner?.schema;
	if (next === undefined) return {};
	return (next as { shape?: object }).shape ?? schemaShape(next);
}
