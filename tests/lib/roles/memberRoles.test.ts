import { Collection, type Guild, type GuildMember } from "discord.js";
import { UserFacingError } from "@core/errors";
import { grantableRoles, setMemberRoles } from "@lib/roles/memberRoles.util";

const GUILD = "900000000000000001";
const LOW = "300000000000000001";
const MIDDLE = "300000000000000002";
const HIGH = "300000000000000003";

const role = (id: string, name: string, position: number, managed = false) =>
	[id, { id, name, position, managed, hexColor: "#000000" }] as const;

function scene(held: string[]) {
	const add = jest.fn(() => Promise.resolve(member));
	const remove = jest.fn(() => Promise.resolve(member));
	const member = {
		id: "100000000000000002",
		roles: { cache: new Collection(held.map((id) => [id, { id }])), add, remove },
	} as unknown as GuildMember;
	const guild = {
		id: GUILD,
		ownerId: "100000000000000099",
		members: { me: { roles: { highest: { position: 50 } } } },
		roles: {
			cache: new Collection([
				role(GUILD, "@everyone", 0),
				role(LOW, "Low", 1),
				role(MIDDLE, "Middle", 5),
				role(HIGH, "High", 20),
				role("300000000000000004", "Integration", 2, true),
			]),
		},
	} as unknown as Guild;
	const reader = { id: "100000000000000001", roles: { highest: { position: 10 } } } as unknown as GuildMember;
	return { guild, member, reader, add, remove };
}

describe("grantableRoles", () => {
	it("offers only what the reader could hand out, highest first, never @everyone or a managed role", () => {
		const { guild, reader } = scene([]);

		expect(grantableRoles(guild, reader).map((entry) => entry.name)).toEqual(["Middle", "Low"]);
		expect(grantableRoles(guild, undefined).map((entry) => entry.name)).toEqual(["High", "Middle", "Low"]);
	});
});

describe("setMemberRoles", () => {
	/** High sits above the reader, so a list that leaves it out must not read as "take High away". */
	it("adds and removes within reach, and leaves a role above the reader alone", async () => {
		const { guild, member, reader, add, remove } = scene([LOW, HIGH]);

		const result = await setMemberRoles(guild, member, [MIDDLE], reader, "mod");

		expect(add).toHaveBeenCalledWith([MIDDLE], "Added by mod");
		expect(remove).toHaveBeenCalledWith([LOW], "Removed by mod");
		expect(result).toEqual(expect.objectContaining({ added: [MIDDLE], removed: [LOW] }));
	});

	it("refuses a role out of reach before it changes anything", async () => {
		const { guild, member, reader, add, remove } = scene([LOW]);

		await expect(setMemberRoles(guild, member, [LOW, HIGH], reader, "mod")).rejects.toThrow(UserFacingError);
		expect(add).not.toHaveBeenCalled();
		expect(remove).not.toHaveBeenCalled();
	});

	it("asks Discord nothing when nothing changes", async () => {
		const { guild, member, reader, add, remove } = scene([LOW]);

		await setMemberRoles(guild, member, [LOW], reader, "mod");

		expect(add).not.toHaveBeenCalled();
		expect(remove).not.toHaveBeenCalled();
	});
});
