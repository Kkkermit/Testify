import { PermissionFlagsBits } from "discord.js";
import { type TestifyClient } from "@core/client";
import { getAutoRoles } from "@database/repositories/autoRoleRepository";
import guildMemberAdd from "@events/create/guildMemberAdd.event";
import { fakeGuild, fakeMember } from "@tests/helpers/roles";

jest.mock("@database/repositories/autoRoleRepository", () => ({ getAutoRoles: jest.fn() }));
jest.mock("@database/repositories/welcomeRepository", () => ({ getWelcome: jest.fn(() => Promise.resolve(null)) }));
jest.mock("@lib/info", () => ({ countMove: jest.fn() }));
jest.mock("@lib/invites", () => ({ trackJoin: jest.fn(() => Promise.resolve()) }));
jest.mock("@lib/moderation", () => ({ writeAuditLog: jest.fn(() => Promise.resolve()) }));
jest.mock("@lib/raid", () => ({ guardJoin: jest.fn(() => Promise.resolve()) }));
jest.mock("@lib/settings", () => ({ syncVoiceCounters: jest.fn(() => Promise.resolve()) }));

/** Roles on join go to everybody who joins, so one given Kick Members after it was chosen made every newcomer a moderator. */
it("gives a role on join only while it carries no moderation or admin permissions", async () => {
	const guild = fakeGuild([
		{ id: "plain", position: 5 },
		{ id: "mods", position: 10, permissions: [PermissionFlagsBits.KickMembers] },
	]);
	const { member, add } = fakeMember(guild, "100000000000000002");
	Object.assign(member, { user: { displayAvatarURL: () => "" } });
	jest.mocked(getAutoRoles).mockResolvedValue({ guildId: guild.id, roleIds: ["mods", "plain"] } as never);
	const client = { featuresOff: new Set(), logger: { warn: jest.fn() } } as unknown as TestifyClient;

	await guildMemberAdd.run(client, member);

	expect(add.mock.calls.map(([roleId]: unknown[]) => roleId)).toEqual(["plain"]);
	expect(jest.mocked(client.logger.warn)).toHaveBeenCalledWith(
		expect.objectContaining({ roleId: "mods" }),
		expect.stringContaining("moderation or admin permissions"),
	);
});
