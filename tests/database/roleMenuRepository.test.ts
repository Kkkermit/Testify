import { describeWithMongo } from "../helpers/mongo";
import {
	countRoleMenus,
	createRoleMenu,
	deleteRoleMenu,
	findRoleMenu,
	listRoleMenus,
	setRoleMenuMessage,
	updateRoleMenu,
} from "@database/repositories/roleMenuRepository";
import { purgeGuild } from "@database/repositories/settingsRepository";

const GUILD = "900000000000000001";
const OTHER = "900000000000000002";
const FIELDS = {
	channelId: "400000000000000001",
	title: "Pings",
	description: "",
	roleIds: ["300000000000000001"],
	mode: "many" as const,
};

describeWithMongo("roleMenuRepository", () => {
	it("makes a menu unposted, and lists a server's menus oldest first", async () => {
		const first = await createRoleMenu(GUILD, FIELDS, "1");
		await createRoleMenu(GUILD, { ...FIELDS, title: "Regions" }, "1");

		expect(first.messageId).toBeNull();
		expect((await listRoleMenus(GUILD)).map((menu) => menu.title)).toEqual(["Pings", "Regions"]);
		expect(await countRoleMenus(GUILD)).toBe(2);
	});

	/** An id from one server's panel must never reach another server's menu. */
	it("never finds, changes or deletes another server's menu by its id", async () => {
		const theirs = await createRoleMenu(OTHER, FIELDS, "1");

		expect(await findRoleMenu(GUILD, theirs.id)).toBeNull();
		expect(await updateRoleMenu(GUILD, theirs.id, { title: "Mine now" }, "2")).toBeNull();
		expect(await deleteRoleMenu(GUILD, theirs.id)).toBeNull();
		expect((await findRoleMenu(OTHER, theirs.id))?.title).toBe("Pings");
	});

	it("answers null for an id that is not one, rather than throwing", async () => {
		expect(await findRoleMenu(GUILD, "not-an-id")).toBeNull();
		expect(await deleteRoleMenu(GUILD, "$where")).toBeNull();
	});

	it("changes only what it was given, and remembers its post", async () => {
		const menu = await createRoleMenu(GUILD, FIELDS, "1");

		const changed = await updateRoleMenu(GUILD, menu.id, { mode: "one" }, "2");
		await setRoleMenuMessage(GUILD, menu.id, "500000000000000001");

		expect(changed).toMatchObject({ mode: "one", title: "Pings", updatedBy: "2" });
		expect((await findRoleMenu(GUILD, menu.id))?.messageId).toBe("500000000000000001");
	});

	it("answers with what it deleted", async () => {
		const menu = await createRoleMenu(GUILD, FIELDS, "1");

		expect((await deleteRoleMenu(GUILD, menu.id))?.title).toBe("Pings");
		expect(await findRoleMenu(GUILD, menu.id)).toBeNull();
	});

	it("goes when the bot leaves the server", async () => {
		await createRoleMenu(GUILD, FIELDS, "1");
		await createRoleMenu(OTHER, FIELDS, "1");

		await purgeGuild(GUILD);

		expect(await countRoleMenus(GUILD)).toBe(0);
		expect(await countRoleMenus(OTHER)).toBe(1);
	});
});
