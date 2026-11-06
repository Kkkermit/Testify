import { type Guild, type GuildMember, type Invite, PermissionFlagsBits } from "discord.js";
import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { getInviteSettings, markLeft, recordJoin, standingOf } from "@database/repositories/inviteRepository";
import { type InviteSnapshot, usedInvite } from "@testify/shared";

/** Which invite brought each member, told apart by comparing every invite's use count before and after a join. */

interface ServerInvites {
	invites: Map<string, InviteSnapshot>;
	vanityUses: number | null;
}

/** The last count seen per server; it lives only in memory, so a restart reads it afresh. */
const seen = new Map<string, ServerInvites>();

/** Joins in one server are compared one at a time, so two at once do not read the same before. */
const queues = new Map<string, Promise<void>>();

function inOrder(guildId: string, work: () => Promise<void>): Promise<void> {
	const next = (queues.get(guildId) ?? Promise.resolve()).then(work, work);
	queues.set(guildId, next);
	return next.finally(() => {
		if (queues.get(guildId) === next) queues.delete(guildId);
	});
}

export function canReadInvites(guild: Guild): boolean {
	return guild.members.me?.permissions.has(PermissionFlagsBits.ManageGuild) === true;
}

function snapshotOf(invite: Invite): InviteSnapshot {
	return { uses: invite.uses ?? 0, inviterId: invite.inviterId ?? null, inviterName: invite.inviter?.username ?? null };
}

/** Null when Discord will not list them, which it refuses without Manage Server. */
async function readInvites(guild: Guild): Promise<ServerInvites | null> {
	if (!canReadInvites(guild)) return null;

	const listed = await guild.invites.fetch({ cache: false }).catch(() => null);
	if (listed === null) return null;

	const vanityUses =
		guild.vanityURLCode === null
			? null
			: await guild.fetchVanityData().then(
					(data) => data.uses,
					() => null,
				);
	return { invites: new Map([...listed].map(([code, invite]) => [code, snapshotOf(invite)])), vanityUses };
}

/** Reads a server's invites so the next join has something to compare against. */
export async function primeInvites(guild: Guild): Promise<void> {
	const current = await readInvites(guild);
	if (current === null) seen.delete(guild.id);
	else seen.set(guild.id, current);
}

export function rememberInvite(invite: Invite): void {
	if (invite.guild === null) return;
	seen.get(invite.guild.id)?.invites.set(invite.code, snapshotOf(invite));
}

export function forgetInvite(invite: Invite): void {
	if (invite.guild === null) return;
	seen.get(invite.guild.id)?.invites.delete(invite.code);
}

function vanityGrew(before: ServerInvites | null, after: ServerInvites | null): boolean {
	const was = before?.vanityUses ?? null;
	const now = after?.vanityUses ?? null;
	return was !== null && now !== null && now > was;
}

/** Records how a member joined, and posts it to the server's log channel when it has one; never fails the join. */
export async function trackJoin(client: TestifyClient, member: GuildMember): Promise<void> {
	const guild = member.guild;
	const settings = await getInviteSettings(guild.id);
	if (settings?.enabled !== true || member.user.bot) return;

	await inOrder(guild.id, async () => {
		const before = seen.get(guild.id) ?? null;
		const after = await readInvites(guild);
		if (after !== null) seen.set(guild.id, after);

		const code = before === null || after === null ? null : usedInvite(before.invites, after.invites);
		const vanity = code === null && vanityGrew(before, after);
		const invite = code === null ? null : (after?.invites.get(code) ?? before?.invites.get(code) ?? null);

		await recordJoin({
			guildId: guild.id,
			memberId: member.id,
			memberName: member.user.username,
			inviterId: invite?.inviterId ?? null,
			inviterName: invite?.inviterName ?? null,
			code: vanity ? guild.vanityURLCode : code,
			vanity,
			joinedAt: new Date(),
		});

		if (settings.logChannelId !== null) {
			await postJoin(client, guild, settings.logChannelId, member, { code, vanity, invite });
		}
	}).catch((error: unknown) => {
		client.logger.warn({ err: toError(error), guildId: guild.id }, "[INVITES] Could not record how a member joined.");
	});
}

async function postJoin(
	client: TestifyClient,
	guild: Guild,
	channelId: string,
	member: GuildMember,
	how: { code: string | null; vanity: boolean; invite: InviteSnapshot | null },
): Promise<void> {
	const channel = await guild.channels.fetch(channelId).catch(() => null);
	if (channel?.isSendable() !== true) {
		client.logger.debug({ guildId: guild.id }, "[INVITES] The invite log channel cannot be posted in.");
		return;
	}

	const inviterId = how.invite?.inviterId ?? null;
	let line = `📨 ${member} (${member.user.username}) joined`;
	if (how.vanity) line += " with the server's own link.";
	else if (inviterId === null) line += ", but I could not tell which invite they used.";
	else {
		const { joins, left } = await standingOf(guild.id, inviterId);
		line += ` with <@${inviterId}>'s invite \`${how.code ?? ""}\`, which has brought ${String(joins)} (${String(joins - left)} still here).`;
	}

	await channel.send({ content: line, allowedMentions: { parse: [] } }).catch(() => undefined);
}

export async function trackLeave(member: { guild: Guild; id: string }): Promise<void> {
	const settings = await getInviteSettings(member.guild.id);
	if (settings?.enabled === true) await markLeft(member.guild.id, member.id);
}

export function clearInviteSnapshots(): void {
	seen.clear();
	queues.clear();
}
