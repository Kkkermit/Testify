import { PermissionFlagsBits } from "discord.js";
import { grantProblem, isPowerful, offerProblem, pickProblem } from "@lib/roles/roleReach.util";
import { fakeGuild, fakeMember, GUILD_ID, SERVER_OWNER } from "@tests/helpers/roles";

const guild = fakeGuild([
	{ id: "low", position: 5 },
	{ id: "mine", position: 40 },
	{ id: "above-me", position: 45 },
	{ id: "above-bot", position: 60 },
	{ id: "integration", position: 3, managed: true },
	{ id: "mods", position: 10, permissions: [PermissionFlagsBits.KickMembers] },
	{ id: "pings", position: 8, permissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
]);
const manager = fakeMember(guild, "100000000000000001", [], 40).member;

describe("who may have the bot hand out a role", () => {
	it("allows a plain role below both the bot and the person asking", () => {
		expect(grantProblem(manager, "low", guild)).toBeNull();
	});

	/** Discord's own Manage Roles rule, so the dashboard and the panel reach no further than the role list would. */
	it("refuses a role at or above the person's own highest", () => {
		expect(grantProblem(manager, "mine", guild)).toMatch(/your own highest role/);
		expect(grantProblem(manager, "above-me", guild)).toMatch(/your own highest role/);
	});

	it("lets the server's owner and the bot's owner past their own rank, but never past the bot's", () => {
		const owner = fakeMember(guild, SERVER_OWNER, [], 1).member;

		expect(grantProblem(owner, "above-me", guild)).toBeNull();
		expect(grantProblem(undefined, "above-me", guild)).toBeNull();
		expect(grantProblem(undefined, "above-bot", guild)).toMatch(/bot's own highest role/);
	});

	it("refuses @everyone, an integration's role and a role that is not there", () => {
		expect(grantProblem(manager, GUILD_ID, guild)).toMatch(/managed by Discord/);
		expect(grantProblem(manager, "integration", guild)).toMatch(/managed by Discord/);
		expect(grantProblem(manager, "missing", guild)).toMatch(/not in this server/);
	});
});

describe("what may go on a menu members pick from", () => {
	/** A self-assigned role that kicks would let anybody in the server kick. */
	it("refuses a role that moderates or administers, even for the server's owner", () => {
		const owner = fakeMember(guild, SERVER_OWNER, [], 99).member;

		const mods = guild.roles.cache.get("mods");
		expect(mods !== undefined && isPowerful(mods)).toBe(true);
		expect(offerProblem(owner, "mods", guild)).toMatch(/moderation or admin permissions/);
	});

	it("allows a role whose permissions only let somebody talk", () => {
		expect(offerProblem(manager, "pings", guild)).toBeNull();
	});

	it("checks the grant rule first", () => {
		expect(offerProblem(manager, "above-me", guild)).toMatch(/your own highest role/);
	});
});

describe("whether a member's pick is honoured", () => {
	it("needs only the bot's reach, since the member is asking for themselves", () => {
		expect(pickProblem(guild.roles.cache.get("above-me"), guild)).toBeNull();
		expect(pickProblem(guild.roles.cache.get("above-bot"), guild)).toMatch(/bot's own highest role/);
	});

	/** A role can be given Kick Members after the menu was made, and the menu must stop handing it out. */
	it("refuses a role that has since become powerful", () => {
		expect(pickProblem(guild.roles.cache.get("mods"), guild)).toMatch(/now carries/);
	});
});
