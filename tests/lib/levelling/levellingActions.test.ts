import { type GuildMember, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import { type Logger } from "@core/logger";
import { type LevelConfig } from "@lib/levelling/levelling.types";
import { DEFAULT_LEVEL_CONFIG } from "@lib/levelling/levelling.util";
import { applyLevelRewards } from "@lib/levelling/levellingActions.util";

const BRONZE = "400000000000000001";
const SILVER = "400000000000000002";

interface RoleStub {
	id: string;
	position: number;
	managed?: boolean;
}

interface MemberStubOptions {
	held?: string[];
	roles?: RoleStub[];
	/** The position of the bot's own highest role. */
	botCeiling?: number;
	canManageRoles?: boolean;
	addFails?: boolean;
}

function memberStub(options: MemberStubOptions = {}): {
	member: GuildMember;
	add: jest.Mock;
	remove: jest.Mock;
} {
	const {
		held = [],
		roles = [
			{ id: BRONZE, position: 1 },
			{ id: SILVER, position: 2 },
		],
		botCeiling = 10,
		canManageRoles = true,
		addFails = false,
	} = options;

	const add = jest.fn(addFails ? () => Promise.reject(new Error("Missing Permissions")) : () => Promise.resolve());
	const remove = jest.fn(() => Promise.resolve());

	const member = {
		roles: { cache: new Map(held.map((id) => [id, { id }])), add, remove },
		guild: {
			id: "1",
			roles: { cache: new Map(roles.map((role) => [role.id, { managed: false, ...role }])) },
			members: {
				me: {
					permissions: new PermissionsBitField(canManageRoles ? PermissionFlagsBits.ManageRoles : 0n),
					roles: { highest: { position: botCeiling } },
				},
			},
		},
	} as unknown as GuildMember;

	return { member, add, remove };
}

function config(overrides: Partial<LevelConfig> = {}): LevelConfig {
	return { ...DEFAULT_LEVEL_CONFIG, enabled: true, ...overrides };
}

const rewards = [
	{ level: 5, roleId: BRONZE },
	{ level: 10, roleId: SILVER },
];

function silentLogger(): Logger {
	return {
		warn: jest.fn(),
		error: jest.fn(),
		info: jest.fn(),
		debug: jest.fn(),
		trace: jest.fn(),
	} as unknown as Logger;
}

describe("applyLevelRewards", () => {
	/** Without Manage Roles, rewards are skipped and warned about once, never shown to the member as an error. */
	it("skips everything and warns when the bot cannot manage roles", async () => {
		const { member, add } = memberStub({ canManageRoles: false });
		const logger = silentLogger();
		const outcome = await applyLevelRewards(member, config({ rewards }), 10, logger);

		expect(outcome.added).toEqual([]);
		expect(outcome.skipped).toEqual([BRONZE, SILVER]);
		expect(add).not.toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalledTimes(1);
	});

	/** Discord refuses a role at or above the bot's own highest, so do not even try. */
	it("skips a reward role that sits above the bot", async () => {
		const { member, add } = memberStub({ roles: [{ id: BRONZE, position: 99 }], botCeiling: 10 });
		const outcome = await applyLevelRewards(member, config({ rewards: [rewards[0]!] }), 5);

		expect(outcome).toEqual({ added: [], removed: [], skipped: [BRONZE] });
		expect(add).not.toHaveBeenCalled();
	});

	/** Somebody who joins late, or has a level set by an admin, is owed every tier. */
	it("catches up every reward at once", async () => {
		const { member, add } = memberStub();
		const outcome = await applyLevelRewards(member, config({ rewards }), 40);

		expect(outcome.added).toEqual([BRONZE, SILVER]);
		expect(add).toHaveBeenCalledTimes(2);
	});
});
