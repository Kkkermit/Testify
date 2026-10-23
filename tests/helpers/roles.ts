import { Collection, type Guild, type GuildMember, PermissionsBitField, type Role } from "discord.js";

/** A server whose roles carry real permission bitfields, for the rules about who may be handed which role. */

export const GUILD_ID = "900000000000000001";
export const SERVER_OWNER = "100000000000000099";

export interface RoleSpec {
	id: string;
	name?: string;
	position: number;
	managed?: boolean;
	permissions?: bigint[];
}

export function fakeRole(spec: RoleSpec): Role {
	return {
		id: spec.id,
		name: spec.name ?? spec.id,
		position: spec.position,
		managed: spec.managed ?? false,
		permissions: new PermissionsBitField(spec.permissions ?? []),
	} as unknown as Role;
}

/** The bot's own highest role sits at `botHighest`, 50 unless said otherwise. */
export function fakeGuild(roles: RoleSpec[], botHighest = 50): Guild {
	const cache = new Collection<string, Role>([[GUILD_ID, fakeRole({ id: GUILD_ID, name: "@everyone", position: 0 })]]);
	for (const spec of roles) cache.set(spec.id, fakeRole(spec));

	return {
		id: GUILD_ID,
		ownerId: SERVER_OWNER,
		roles: { cache },
		members: { me: { roles: { highest: { position: botHighest } } } },
	} as unknown as Guild;
}

export interface FakeMember {
	member: GuildMember;
	add: jest.Mock;
	remove: jest.Mock;
}

/** A member holding `held`, whose own highest role sits at `highest`. */
export function fakeMember(guild: Guild, id: string, held: string[] = [], highest = 40): FakeMember {
	const add = jest.fn(() => Promise.resolve());
	const remove = jest.fn(() => Promise.resolve());
	const cache = new Collection<string, Role>(
		held.flatMap((roleId) => {
			const role = guild.roles.cache.get(roleId);
			return role === undefined ? [] : [[roleId, role] as const];
		}),
	);

	return {
		member: { id, guild, roles: { cache, highest: { position: highest }, add, remove } } as unknown as GuildMember,
		add,
		remove,
	};
}
