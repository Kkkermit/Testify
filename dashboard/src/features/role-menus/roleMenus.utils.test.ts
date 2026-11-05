import { type RoleMenuEntry, type RoleSummary } from "@testify/shared";
import { draftOf, offerBlocked, roleMenuSummary } from "@/features/role-menus/roleMenus.utils";
import { i18next } from "@/i18n";

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
});

describe("roleMenuSummary", () => {
	const t = i18next.getFixedT("en");

	/** A menu that was never posted hands out nothing, so it must not be counted as one members can use. */
	it("counts only the menus members can pick from", () => {
		expect(roleMenuSummary([], t)).toBe("There are no role menus yet, so members cannot pick their own roles.");
		expect(roleMenuSummary([{ posted: false }], t)).toBe(
			"No menu is posted yet, so members cannot pick roles from one.",
		);
		expect(roleMenuSummary([{ posted: true }, { posted: false }], t)).toBe(
			"Members pick their own roles from 1 posted menu.",
		);
		expect(roleMenuSummary([{ posted: true }, { posted: true }], t)).toBe(
			"Members pick their own roles from 2 posted menus.",
		);
	});
});
