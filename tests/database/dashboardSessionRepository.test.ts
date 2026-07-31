import { DashboardSessions } from "@database/models/dashboardSession.schema";
import {
	createSession,
	deleteSession,
	deleteSessionsFor,
	findSession,
	markGuildsCached,
	type NewSession,
	readTokens,
	touchSession,
	updateTokens,
} from "@database/repositories/dashboardSessionRepository";
import { createSecretBox } from "@lib/secretBox.util";
import { describeWithMongo, mongoAvailable } from "@tests/helpers/mongo";

const box = createSecretBox("a-long-enough-dashboard-session-secret");
const USER = "100000000000000001";

function details(overrides: Partial<NewSession> = {}): NewSession {
	return {
		userId: USER,
		username: "someone",
		avatar: null,
		isOwner: false,
		accessToken: "access-token",
		refreshToken: "refresh-token",
		tokenExpiresAt: new Date(Date.now() + 604_800_000),
		...overrides,
	};
}

describeWithMongo("the dashboard session repository", () => {
	it("issues an id and a CSRF secret that are not each other", async () => {
		if (!mongoAvailable()) return;
		const issued = await createSession(box, details(), 7);

		expect(issued.id).toHaveLength(43);
		expect(issued.csrfSecret).not.toBe(issued.id);
		expect(issued.expiresAt.getTime()).toBeGreaterThan(Date.now());
	});

	/** A database dump must not hand over live OAuth tokens for everyone who has ever signed in. */
	it("never writes a Discord token in plaintext", async () => {
		if (!mongoAvailable()) return;
		const issued = await createSession(box, details(), 7);
		const stored = await DashboardSessions.findById(issued.id).lean().exec();

		expect(stored?.accessToken).not.toContain("access-token");
		expect(stored?.refreshToken).not.toContain("refresh-token");
	});

	it("gives the tokens back through the same box", async () => {
		if (!mongoAvailable()) return;
		const issued = await createSession(box, details(), 7);
		const session = await findSession(issued.id);

		expect(readTokens(box, session!)).toEqual({ accessToken: "access-token", refreshToken: "refresh-token" });
	});

	/** Rotating the secret has to lock everyone out rather than throw somewhere further in. */
	it("returns no tokens when the secret has changed since login", async () => {
		if (!mongoAvailable()) return;
		const issued = await createSession(box, details(), 7);
		const session = await findSession(issued.id);

		expect(readTokens(createSecretBox("an-entirely-different-session-secret"), session!)).toBeNull();
	});

	it("finds nothing for an id that was never issued", async () => {
		if (!mongoAvailable()) return;
		expect(await findSession("not-a-real-session")).toBeNull();
	});

	/**
	 * Mongo's TTL sweep runs about once a minute, so an expired document is still readable for a while. The
	 * repository has to decide, not the index.
	 */
	it("refuses a session that has expired but not yet been swept", async () => {
		if (!mongoAvailable()) return;
		const issued = await createSession(box, details(), 7);
		await DashboardSessions.updateOne({ _id: issued.id }, { $set: { expiresAt: new Date(Date.now() - 1_000) } }).exec();

		expect(await findSession(issued.id)).toBeNull();
	});

	it("rolls the window forward so a long edit does not sign someone out", async () => {
		if (!mongoAvailable()) return;
		const issued = await createSession(box, details(), 1);
		await touchSession(issued.id, 7);

		const session = await findSession(issued.id);
		expect(session!.expiresAt.getTime()).toBeGreaterThan(issued.expiresAt.getTime());
	});

	it("re-seals refreshed tokens rather than storing them as they arrived", async () => {
		if (!mongoAvailable()) return;
		const issued = await createSession(box, details(), 7);
		const tokenExpiresAt = new Date(Date.now() + 604_800_000);
		await updateTokens(box, issued.id, { accessToken: "newer", refreshToken: "newer-refresh", tokenExpiresAt });

		const stored = await DashboardSessions.findById(issued.id).lean().exec();
		expect(stored?.accessToken).not.toContain("newer");
		expect(readTokens(box, (await findSession(issued.id))!)?.accessToken).toBe("newer");
	});

	it("records when the guild list was last cached", async () => {
		if (!mongoAvailable()) return;
		const issued = await createSession(box, details(), 7);
		expect((await findSession(issued.id))?.guildsCachedAt).toBeNull();

		await markGuildsCached(issued.id);
		expect((await findSession(issued.id))?.guildsCachedAt).toBeInstanceOf(Date);
	});

	it("deletes one session without touching the others", async () => {
		if (!mongoAvailable()) return;
		const first = await createSession(box, details(), 7);
		const second = await createSession(box, details(), 7);
		await deleteSession(first.id);

		expect(await findSession(first.id)).toBeNull();
		expect(await findSession(second.id)).not.toBeNull();
	});

	/** The panic button has to end every browser at once, not just the one that pressed it. */
	it("signs a user out everywhere and leaves other people alone", async () => {
		if (!mongoAvailable()) return;
		await createSession(box, details(), 7);
		await createSession(box, details(), 7);
		const other = await createSession(box, details({ userId: "200000000000000002" }), 7);

		expect(await deleteSessionsFor(USER)).toBe(2);
		expect(await findSession(other.id)).not.toBeNull();
	});
});
