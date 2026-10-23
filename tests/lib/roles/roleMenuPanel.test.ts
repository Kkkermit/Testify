import { ButtonStyle } from "discord.js";
import { parseCustomId } from "@core/button";
import { type StoredRoleMenu } from "@database/repositories/roleMenuRepository";
import { type ContainerMessage } from "@lib/discord/discord.types";
import {
	type OfferedRole,
	pickNote,
	roleMenuEditor,
	roleMenuHub,
	roleMenuPicker,
	roleMenuPost,
} from "@lib/roles/roleMenuPanel.util";
import { ROLE_MENU_LIMITS } from "@testify/shared";
import { buttonsOf, duplicateIds, idsOf, textOf } from "@tests/helpers/containers";

const OWNER = "100000000000000001";
const MENU: StoredRoleMenu = {
	id: "6650a1b2c3d4e5f6a7b8c9d0",
	guildId: "900000000000000001",
	channelId: "400000000000000001",
	messageId: null,
	title: "Pick your pings",
	description: "Choose what you hear about.",
	roleIds: ["300000000000000001", "300000000000000002"],
	mode: "many",
	updatedBy: null,
};

const offered = (held: boolean[], available = [true, true]): OfferedRole[] =>
	MENU.roleIds.map((id, index) => ({
		id,
		name: `Role ${String(index + 1)}`,
		held: held[index] ?? false,
		available: available[index] ?? true,
	}));

interface Select {
	custom_id: string;
	min_values?: number;
	max_values?: number;
	options?: { value: string; default?: boolean }[];
	default_values?: { id: string }[];
}

function selectsOf(rendered: ContainerMessage): Select[] {
	const found: Select[] = [];
	const descend = (node: unknown): void => {
		if (node === null || typeof node !== "object") return;
		const record = node as Record<string, unknown>;
		if ([3, 6, 8].includes(record.type as number)) found.push(record as unknown as Select);
		for (const value of Object.values(record)) {
			if (Array.isArray(value)) value.forEach(descend);
			else if (typeof value === "object") descend(value);
		}
	};
	rendered.components.forEach((component) => descend(component.toJSON()));
	return found;
}

function componentCount(rendered: ContainerMessage): number {
	let count = 0;
	const descend = (node: unknown): void => {
		if (node === null || typeof node !== "object") return;
		const record = node as Record<string, unknown>;
		if (typeof record.type === "number") count += 1;
		for (const value of Object.values(record)) {
			if (Array.isArray(value)) value.forEach(descend);
			else if (typeof value === "object") descend(value);
		}
	};
	rendered.components.forEach((component) => descend(component.toJSON()));
	return count;
}

describe("the posted menu", () => {
	it("lists the roles on offer and opens the private picker for this menu", () => {
		const post = roleMenuPost(MENU);

		expect(textOf(post)).toContain("<@&300000000000000001>");
		expect(textOf(post)).toContain("Choose what you hear about.");
		expect(idsOf(post)).toEqual([`rolemenu:open:${MENU.id}`]);
	});

	/** Everybody sees the same post, so it carries no owner and no per-person state. */
	it("is the same for everybody", () => {
		expect(idsOf(roleMenuPost(MENU)).every((id) => !id.includes(OWNER))).toBe(true);
	});

	it("says whether one role or several may be held", () => {
		expect(textOf(roleMenuPost(MENU))).toMatch(/as many as you like/);
		expect(textOf(roleMenuPost({ ...MENU, mode: "one" }))).toMatch(/one of these at a time/);
	});
});

describe("the private picker", () => {
	/** Pre-ticked is what makes the menu the list: unticking a role is how somebody gives it back. */
	it("ticks the roles the member already holds", () => {
		const [menu] = selectsOf(roleMenuPicker(MENU, offered([true, false])));

		expect(menu?.custom_id).toBe(`rolemenu:pick:${MENU.id}`);
		expect(menu?.min_values).toBe(0);
		expect(menu?.max_values).toBe(2);
		expect(menu?.options?.map((entry) => entry.default)).toEqual([true, false]);
	});

	/** Discord refuses a single-choice menu with two defaults, which would break the whole reply. */
	it("ticks at most one role when only one may be held", () => {
		const [menu] = selectsOf(roleMenuPicker({ ...MENU, mode: "one" }, offered([true, true])));

		expect(menu?.max_values).toBe(1);
		expect(menu?.options?.filter((entry) => entry.default === true)).toHaveLength(1);
	});

	it("leaves out a role it cannot hand out, and names it", () => {
		const rendered = roleMenuPicker(MENU, offered([false, false], [true, false]));

		expect(selectsOf(rendered)[0]?.options?.map((entry) => entry.value)).toEqual(["300000000000000001"]);
		expect(textOf(rendered)).toMatch(/Not on offer right now: Role 2/);
	});

	it("says so when nothing on the menu can be handed out", () => {
		const rendered = roleMenuPicker(MENU, offered([false, false], [false, false]));

		expect(selectsOf(rendered)).toHaveLength(0);
		expect(textOf(rendered)).toMatch(/None of these roles can be handed out/);
	});

	it("words what a pick did", () => {
		expect(pickNote({ added: ["Red"], removed: ["Blue"], refused: [] })).toBe("Added Red. Removed Blue.");
		expect(pickNote({ added: [], removed: [], refused: [] })).toBe("Nothing changed.");
		expect(pickNote({ added: [], removed: [], refused: ["Mods"] })).toMatch(/Could not change Mods/);
	});
});

describe("the manager's panels", () => {
	it("puts the person who opened it last in every control", () => {
		const editor = roleMenuEditor({ menu: MENU }, OWNER);
		const hub = roleMenuHub([MENU], OWNER);

		for (const id of [...idsOf(editor), ...idsOf(hub)]) expect(parseCustomId(id).args.at(-1)).toBe(OWNER);
		expect(duplicateIds(editor)).toEqual([]);
	});

	it("pre-ticks the roles on offer and the channel it is posted in", () => {
		const [roles, channel] = selectsOf(roleMenuEditor({ menu: MENU }, OWNER));

		expect(roles?.default_values?.map((entry) => entry.id)).toEqual(MENU.roleIds);
		expect(roles?.min_values).toBe(0);
		expect(channel?.default_values?.map((entry) => entry.id)).toEqual([MENU.channelId]);
	});

	it("will not post a menu with nothing on it", () => {
		const post = buttonsOf(roleMenuEditor({ menu: { ...MENU, roleIds: [] } }, OWNER)).find((entry) =>
			String(entry.custom_id).includes(":post:"),
		);

		expect(post?.disabled).toBe(true);
	});

	it("names each refused role beside the list", () => {
		const rendered = roleMenuEditor({ menu: MENU, refused: ["Mods carries moderation or admin permissions."] }, OWNER);

		expect(textOf(rendered)).toMatch(/Not added[\s\S]*Mods carries/);
	});

	it("asks before deleting, with nothing else to press", () => {
		const buttons = buttonsOf(roleMenuEditor({ menu: MENU, confirmingDelete: true }, OWNER)).filter(
			(entry) => entry.style === ButtonStyle.Danger || String(entry.custom_id).includes("delete"),
		);

		expect(buttons.map((entry) => parseCustomId(String(entry.custom_id)).action)).toEqual(["delete-yes", "delete-no"]);
	});

	/** Discord rejects a whole message past 40 components, so a full list of menus has to fit. */
	it("fits a full list of menus inside Discord's limit", () => {
		const menus = Array.from({ length: ROLE_MENU_LIMITS.maxPerGuild }, (_, index) => ({
			...MENU,
			id: `${String(index).padStart(2, "0")}50a1b2c3d4e5f6a7b8c9d0`,
		}));
		const hub = roleMenuHub(menus, OWNER, "A note.");

		expect(componentCount(hub)).toBeLessThanOrEqual(40);
		expect(buttonsOf(hub).find((entry) => String(entry.custom_id).includes(":new:"))?.disabled).toBe(true);
	});

	it("fits an editor with every row showing inside Discord's limit", () => {
		const editor = roleMenuEditor({ menu: MENU, note: "A note.", refused: ["One", "Two"] }, OWNER);

		expect(componentCount(editor)).toBeLessThanOrEqual(40);
	});
});
