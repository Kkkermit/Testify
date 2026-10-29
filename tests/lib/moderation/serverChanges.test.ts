import { AuditLogEvent } from "discord.js";
import { type AuditEntryLike, discordChange, pageChanges, readAuditWindow } from "@lib/moderation/serverChanges.util";
import { CHANGE_LIMITS, changeMatches, changesQuery, type ServerChange } from "@testify/shared";

jest.mock("@database/repositories/dashboardAuditRepository", () => ({ auditsSince: jest.fn() }));

const NOW = Date.parse("2026-09-27T12:00:00.000Z");
const DAY = 24 * 60 * 60_000;
const MOD = "100000000000000001";

function entry(overrides: Partial<AuditEntryLike> = {}): AuditEntryLike {
	return {
		id: "1",
		action: AuditLogEvent.ChannelCreate,
		actionType: "Create",
		targetType: "Channel",
		target: { name: "general" },
		executorId: MOD,
		executor: { username: "kate" },
		reason: null,
		createdTimestamp: NOW,
		changes: [],
		...overrides,
	};
}

describe("discordChange", () => {
	it("words an ordinary create, update or delete from its target and action", () => {
		expect(discordChange(entry())).toMatchObject({
			kind: "channel",
			verb: "created",
			target: "general",
			actorTag: "kate",
		});
		expect(discordChange(entry({ actionType: "Update", targetType: "Role", target: { name: "Mods" } }))).toMatchObject({
			kind: "role",
			verb: "updated",
			target: "Mods",
		});
	});

	it("names what a moderation action did to a member", () => {
		const banned = entry({
			action: AuditLogEvent.MemberBanAdd,
			actionType: "Delete",
			targetType: "User",
			target: { username: "marcus" },
		});

		expect(discordChange(banned)).toMatchObject({ kind: "member", verb: "banned", target: "marcus" });
	});

	/** A timeout is recorded by Discord as a plain member update, and read as one it said nothing useful. */
	it("recognises a timeout inside a member update", () => {
		const timedOut = entry({
			action: AuditLogEvent.MemberUpdate,
			actionType: "Update",
			targetType: "User",
			changes: [{ key: "communication_disabled_until", new: "2026-09-28T00:00:00.000Z" }],
		});

		expect(discordChange(timedOut).verb).toBe("timedOut");
		expect(discordChange({ ...timedOut, changes: [{ key: "nick", new: "k" }] }).verb).toBe("updated");
	});

	it("keeps a deleted thing's name from the change record", () => {
		const deleted = entry({ actionType: "Delete", target: { id: "5" }, changes: [{ key: "name", old: "old-chat" }] });

		expect(discordChange(deleted).target).toBe("old-chat");
	});

	it("falls back rather than guessing for a target it does not know", () => {
		expect(discordChange(entry({ targetType: "SoundboardSound", actionType: "All", executor: null }))).toMatchObject({
			kind: "other",
			verb: "other",
			actorTag: MOD,
		});
	});
});

describe("readAuditWindow", () => {
	const full = (from: number, count = 100): AuditEntryLike[] =>
		Array.from({ length: count }, (_, index) =>
			entry({ id: String(from + index), createdTimestamp: NOW - (from + index) * 1_000 }),
		);

	/** A server with thousands of changes a fortnight would otherwise cost a request per hundred on every search. */
	it("stops at the cap and says the list is cut short", async () => {
		let from = 0;
		const read = jest.fn(() => {
			from += 100;
			return Promise.resolve(full(from));
		});

		const window = await readAuditWindow(read, NOW - 14 * DAY);

		expect(window.changes).toHaveLength(CHANGE_LIMITS.maxDiscordEntries);
		expect(window.truncated).toBe(true);
	});
});

describe("pageChanges", () => {
	const change = (overrides: Partial<ServerChange>): ServerChange => ({
		id: "x",
		source: "discord",
		at: new Date(NOW).toISOString(),
		actorId: MOD,
		actorTag: "kate",
		kind: "channel",
		verb: "created",
		summary: null,
		target: "general",
		reason: null,
		...overrides,
	});
	const query = (raw: Record<string, string> = {}) => changesQuery.parse(raw);

	it("filters by where the change was made and by what was typed", () => {
		const all = [
			change({ id: "d", source: "dashboard", kind: "settings", summary: "Turned levelling on" }),
			change({ id: "c" }),
		];

		expect(pageChanges(all, query({ source: "dashboard" }), NOW).items.map((c) => c.id)).toEqual(["d"]);
		expect(pageChanges(all, query({ q: "LEVELLING" }), NOW).items.map((c) => c.id)).toEqual(["d"]);
	});

	it("refuses a window it does not offer", () => {
		expect(changesQuery.safeParse({ days: "5" }).success).toBe(false);
	});
});

describe("changeMatches", () => {
	const base: ServerChange = {
		id: "x",
		source: "discord",
		at: "",
		actorId: MOD,
		actorTag: "kate",
		kind: "member",
		verb: "banned",
		summary: null,
		target: "marcus",
		reason: "Spamming",
	};

	/** A pasted ID is somebody specific, so part of one appearing in a name must not match. */
	it("matches a Discord ID against the actor exactly", () => {
		expect(changeMatches(base, MOD)).toBe(true);
		expect(changeMatches({ ...base, target: `x${MOD}` }, "100000000000000002")).toBe(false);
	});
});
