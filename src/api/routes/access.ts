import { Collection, type Guild, type GuildMember, PermissionFlagsBits } from "discord.js";
import { type Context, Hono } from "hono";
import { auditChange } from "@api/audit";
import { actorOf, type ApiBindings, guildOf } from "@api/context";
import { ApiProblem, notFound } from "@api/errors";
import { requirePermission } from "@api/middleware/reach";
import { requireGuild } from "@api/middleware/session";
import { parseBody, parseParams } from "@api/validate";
import {
	addAccess,
	changeAccess,
	countAccess,
	findAccess,
	listAccess,
	removeAccess,
	type StoredAccess,
} from "@database/repositories/dashboardAccessRepository";
import { auditsBy, type ChangeTally, changesBy } from "@database/repositories/dashboardAuditRepository";
import {
	ACCESS_LIMITS,
	type AccessActivity,
	accessAreasBody,
	accessGrantBody,
	type AccessList,
	type AccessPerson,
	memberParams,
} from "@testify/shared";

export const access = new Hono<ApiBindings>();

access.use("*", requireGuild);
// Handing out a server's screens is the owner's and its admins' to do, never a manager's or a grantee's.
access.use("*", requirePermission(PermissionFlagsBits.Administrator));

function screens(count: number): string {
	return count === 1 ? "1 screen" : `${String(count)} screens`;
}

/** Read from the cache, and any not in it in one request, so a list of fifty is not fifty calls to Discord. */
async function membersOf(guild: Guild, ids: readonly string[]): Promise<Map<string, GuildMember>> {
	const found = new Map<string, GuildMember>();
	for (const id of ids) {
		const member = guild.members.cache.get(id);
		if (member !== undefined) found.set(id, member);
	}

	const missing = ids.filter((id) => !found.has(id));
	if (missing.length > 0) {
		const fetched = await guild.members.fetch({ user: missing }).catch(() => new Collection<string, GuildMember>());
		for (const [id, member] of fetched) found.set(id, member);
	}
	return found;
}

function toPerson(row: StoredAccess, member: GuildMember | undefined, done: ChangeTally | undefined): AccessPerson {
	return {
		userId: row.userId,
		username: member?.user.username ?? row.username,
		avatarUrl: member?.displayAvatarURL({ size: 64 }) ?? null,
		inServer: member !== undefined,
		areas: row.areas,
		addedBy: { id: row.addedBy, name: row.addedByName },
		addedAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
		lastChangeAt: done?.last.toISOString() ?? null,
		changes: done?.count ?? 0,
	};
}

async function peopleOf(guild: Guild, rows: readonly StoredAccess[]): Promise<AccessPerson[]> {
	const ids = rows.map((row) => row.userId);
	const [members, changes] = await Promise.all([membersOf(guild, ids), changesBy(guild.id, ids)]);
	return rows.map((row) => toPerson(row, members.get(row.userId), changes.get(row.userId)));
}

async function personOf(guild: Guild, row: StoredAccess): Promise<AccessPerson> {
	const [members, changes] = await Promise.all([membersOf(guild, [row.userId]), changesBy(guild.id, [row.userId])]);
	return toPerson(row, members.get(row.userId), changes.get(row.userId));
}

async function onePerson(context: Context<ApiBindings>): Promise<{ guild: Guild; row: StoredAccess }> {
	const guild = guildOf(context);
	const { userId } = parseParams(context, memberParams);
	const row = await findAccess(guild.id, userId);
	if (row === null) throw notFound("not_found", "That person has no access to this server's dashboard.");
	return { guild, row };
}

access.get("/", async (context) => {
	const guild = guildOf(context);
	const body: AccessList = { people: await peopleOf(guild, await listAccess(guild.id)) };
	return context.json(body);
});

access.post("/", async (context) => {
	const guild = guildOf(context);
	const { userId, areas } = await parseBody(context, accessGrantBody);

	if ((await countAccess(guild.id)) >= ACCESS_LIMITS.maxPeople) {
		throw new ApiProblem(409, "too_many", `At most ${String(ACCESS_LIMITS.maxPeople)} people can be given access.`);
	}

	const member = await guild.members.fetch(userId).catch(() => null);
	if (member === null) throw new ApiProblem(400, "not_a_member", "That person is not in this server.");
	if (member.user.bot) throw new ApiProblem(400, "is_bot", "A bot cannot sign in to the dashboard.");
	if (member.permissions.has(PermissionFlagsBits.ManageGuild) || context.get("client").isOwner(userId)) {
		throw new ApiProblem(409, "already_full", "They already see every screen here.");
	}

	const actor = actorOf(context);
	const row = await addAccess({
		guildId: guild.id,
		userId,
		username: member.user.username,
		areas,
		addedBy: actor.id,
		addedByName: actor.name,
	});
	if (row === null) throw new ApiProblem(409, "already_given", "They already have access here. Change it instead.");

	await auditChange(context, {
		action: "access.grant",
		summary: `Gave ${member.user.username} access to ${screens(areas.length)}`,
		after: { userId, areas },
	});

	return context.json(await personOf(guild, row), 201);
});

access.get("/:userId", async (context) => {
	const { guild, row } = await onePerson(context);
	const [person, recent] = await Promise.all([
		personOf(guild, row),
		auditsBy(row.userId, 1, ACCESS_LIMITS.activityShown, guild.id),
	]);

	const body: AccessActivity = {
		person,
		items: recent.items.map(({ actorTag, action, summary, at }) => ({
			actorTag,
			action,
			summary,
			at: at.toISOString(),
		})),
	};
	return context.json(body);
});

access.put("/:userId", async (context) => {
	const { guild, row } = await onePerson(context);
	const { areas } = await parseBody(context, accessAreasBody);

	const changed = await changeAccess(guild.id, row.userId, areas);
	if (changed === null) throw notFound("not_found", "That person has no access to this server's dashboard.");

	await auditChange(context, {
		action: "access.update",
		summary: `Changed ${row.username}’s access to ${screens(areas.length)}`,
		before: { areas: row.areas },
		after: { areas },
	});

	return context.json(await personOf(guild, changed));
});

access.delete("/:userId", async (context) => {
	const { guild, row } = await onePerson(context);
	await removeAccess(guild.id, row.userId);

	await auditChange(context, {
		action: "access.revoke",
		summary: `Took away ${row.username}’s access`,
		before: { areas: row.areas },
	});

	return context.body(null, 204);
});
