import { type RoleMenuEntry, type RoleSummary } from "@testify/shared";
import { bodyOf, draftOf, emptyDraft, offerBlocked } from "@/features/role-menus/roleMenus.utils";

const role = (id: string, extra: Partial<RoleSummary> = {}): RoleSummary => ({
	id,
	name: id,
	colour: null,
	position: 1,
	managed: false,
	assignableByBot: true,
	powerful: false,
	...extra,
});

const entry: RoleMenuEntry = {
	id: "6650a1b2c3d4e5f6a7b8c9d0",
	channelId: "400000000000000001",
	title: "Pings",
	description: "",
	roleIds: ["kept", "gone", "admin", "high"],
	mode: "many",
	posted: true,
	canSend: true,
};

describe("the role menu draft", () => {
	/** A role the checklist greys out could never be unticked, and saving it would be refused. */
	it("drops roles that are gone or can no longer be offered", () => {
		const roles = [role("kept"), role("admin", { powerful: true }), role("high", { assignableByBot: false })];

		expect(draftOf(entry, roles).roleIds).toEqual(["kept"]);
	});

	it("refuses a role that administers or sits above the bot", () => {
		expect(offerBlocked(role("a"))).toBe(false);
		expect(offerBlocked(role("a", { powerful: true }))).toBe(true);
		expect(offerBlocked(role("a", { assignableByBot: false }))).toBe(true);
	});

	it("has nothing to send until a channel, a title and a role are chosen", () => {
		const clean = (value: string): string => value.trim();

		expect(bodyOf(emptyDraft(), clean)).toBeNull();
		expect(bodyOf({ ...emptyDraft(), channelId: "1", title: "Pings" }, clean)).toBeNull();
		expect(bodyOf({ ...emptyDraft(), channelId: "1", title: " Pings ", roleIds: ["r"] }, clean)).toEqual({
			channelId: "1",
			title: "Pings",
			description: "",
			roleIds: ["r"],
			mode: "many",
		});
	});
});
