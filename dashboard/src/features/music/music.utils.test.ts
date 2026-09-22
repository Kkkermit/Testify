import { type MusicSettings, type RoleSummary } from "@testify/shared";
import { accessOf, missingRoleIds } from "@/features/music/music.utils";

function settings(overrides: Partial<MusicSettings> = {}): MusicSettings {
	return { enabled: true, djRoleIds: [], configured: true, ...overrides };
}

const roles: RoleSummary[] = [
	{ id: "role-1", name: "DJ", colour: null, position: 1, managed: false, assignableByBot: true },
];

describe("accessOf", () => {
	it("reads off as off, whatever the roles say", () => {
		expect(accessOf(settings({ enabled: false, djRoleIds: ["role-1"] }))).toBe("off");
	});

	it("reads no chosen roles as open to everybody", () => {
		expect(accessOf(settings())).toBe("everybody");
	});

	it("reads any chosen role as limited", () => {
		expect(accessOf(settings({ djRoleIds: ["role-1"] }))).toBe("djs");
	});
});

describe("missingRoleIds", () => {
	/** A role deleted since it was chosen is still stored, and a picker of live roles alone would hide it. */
	it("names a chosen role the server no longer has", () => {
		expect(missingRoleIds(settings({ djRoleIds: ["role-1", "gone"] }), roles)).toEqual(["gone"]);
	});

	it("finds nothing to report when every chosen role still exists", () => {
		expect(missingRoleIds(settings({ djRoleIds: ["role-1"] }), roles)).toEqual([]);
	});
});
