import { createHash, randomBytes } from "node:crypto";
import { type DashboardSession, DashboardSessions } from "@database/models/dashboardSession.schema";
import { type SecretBox } from "@lib/infra/infra.types";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface NewSession {
	userId: string;
	username: string;
	avatar: string | null;
	isOwner: boolean;
	accessToken: string;
	refreshToken: string;
	tokenExpiresAt: Date;
}

interface IssuedSession {
	id: string;
	csrfSecret: string;
	expiresAt: Date;
}

function token(): string {
	return randomBytes(32).toString("base64url");
}

/** Tokens are sealed here, so no route can write one in plaintext. */
export async function createSession(box: SecretBox, session: NewSession, ttlDays: number): Promise<IssuedSession> {
	const id = token();
	const csrfSecret = token();
	const expiresAt = new Date(Date.now() + ttlDays * DAY_MS);

	await DashboardSessions.create({
		_id: id,
		userId: session.userId,
		username: session.username,
		avatar: session.avatar,
		isOwner: session.isOwner,
		csrfSecret,
		accessToken: box.seal(session.accessToken),
		refreshToken: box.seal(session.refreshToken),
		tokenExpiresAt: session.tokenExpiresAt,
		lastSeenAt: new Date(),
		expiresAt,
	});

	return { id, csrfSecret, expiresAt };
}

export async function findSession(id: string): Promise<DashboardSession | null> {
	const session = await DashboardSessions.findById(id).lean<DashboardSession>().exec();
	if (session === null) return null;

	// Mongo's TTL sweep runs about once a minute, so an expired document can still be read.
	return session.expiresAt.getTime() > Date.now() ? session : null;
}

/** Rolls the window forward, so someone working through a long task is never signed out mid-edit. */
export async function touchSession(id: string, ttlDays: number): Promise<void> {
	await DashboardSessions.updateOne(
		{ _id: id },
		{ $set: { lastSeenAt: new Date(), expiresAt: new Date(Date.now() + ttlDays * DAY_MS) } },
	).exec();
}

interface SessionTokens {
	accessToken: string;
	refreshToken: string;
}

/** Null when the secret has changed since the session was written, which makes the session unusable. */
export function readTokens(box: SecretBox, session: DashboardSession): SessionTokens | null {
	const accessToken = box.open(session.accessToken);
	const refreshToken = box.open(session.refreshToken);
	if (accessToken === null || refreshToken === null) return null;

	return { accessToken, refreshToken };
}

export async function updateTokens(
	box: SecretBox,
	id: string,
	tokens: SessionTokens & { tokenExpiresAt: Date },
): Promise<void> {
	await DashboardSessions.updateOne(
		{ _id: id },
		{
			$set: {
				accessToken: box.seal(tokens.accessToken),
				refreshToken: box.seal(tokens.refreshToken),
				tokenExpiresAt: tokens.tokenExpiresAt,
			},
		},
	).exec();
}

export async function deleteSession(id: string): Promise<void> {
	await DashboardSessions.deleteOne({ _id: id }).exec();
}

/** The panic button: every browser this person is signed in on loses access at once. */
export async function deleteSessionsFor(userId: string): Promise<number> {
	return (await DashboardSessions.deleteMany({ userId }).exec()).deletedCount;
}

/** A session's public name: a digest of the cookie, so a list of them hands out nothing that signs anybody in. */
export function sessionHandleOf(id: string): string {
	return createHash("sha256").update(id).digest("hex").slice(0, 24);
}

export interface SessionSummary {
	handle: string;
	createdAt: Date;
	lastSeenAt: Date;
	expiresAt: Date;
	current: boolean;
}

type SessionTimes = Pick<DashboardSession, "_id" | "createdAt" | "lastSeenAt" | "expiresAt">;

/** Every browser one person is signed in on, most recently used first. */
export async function sessionsFor(userId: string, currentId: string): Promise<SessionSummary[]> {
	const rows = await DashboardSessions.find({ userId }, { createdAt: 1, lastSeenAt: 1, expiresAt: 1 })
		.sort({ lastSeenAt: -1 })
		.lean<SessionTimes[]>()
		.exec();

	return rows.map((row) => ({
		handle: sessionHandleOf(row._id),
		createdAt: row.createdAt,
		lastSeenAt: row.lastSeenAt,
		expiresAt: row.expiresAt,
		current: row._id === currentId,
	}));
}

/** Ends one of this person's other sessions by its handle; false for the one asking, or one that is not theirs. */
export async function endSessionByHandle(userId: string, handle: string, currentId: string): Promise<boolean> {
	const rows = await DashboardSessions.find({ userId }, { _id: 1 }).lean<Pick<DashboardSession, "_id">[]>().exec();
	const match = rows.find((row) => row._id !== currentId && sessionHandleOf(row._id) === handle);
	if (match === undefined) return false;

	return (await DashboardSessions.deleteOne({ _id: match._id, userId }).exec()).deletedCount > 0;
}

/** Signs this person out of every browser but the one asking. */
export async function endOtherSessions(userId: string, currentId: string): Promise<number> {
	return (await DashboardSessions.deleteMany({ userId, _id: { $ne: currentId } }).exec()).deletedCount;
}
