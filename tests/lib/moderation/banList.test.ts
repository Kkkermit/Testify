import { Collection, type Guild, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import { listActiveSoftbans } from "@database/repositories/moderationRepository";
import { banMatches, readBans } from "@lib/moderation/banList.util";
import { BAN_LIMITS, type BanEntry } from "@testify/shared";

jest.mock("@database/repositories/moderationRepository", () => ({
	listActiveSoftbans: jest.fn(() => Promise.resolve([])),
}));

const SAM = "100000000000000001";

function banOf(n: number, reason: string | null = null) {
	const id = `1000000000000${String(n).padStart(5, "0")}`;
	return [
		id,
		{ reason, user: { id, username: `user${String(n).padStart(4, "0")}`, displayAvatarURL: () => null } },
	] as const;
}

function guildWith(bans: ReturnType<typeof banOf>[], permissions = [PermissionFlagsBits.BanMembers]) {
	const fetch = jest.fn(() => Promise.resolve(new Collection(bans)));
	return {
		guild: {
			id: "900000000000000001",
			members: { me: { permissions: new PermissionsBitField(permissions) } },
			bans: { fetch },
		} as unknown as Guild,
		fetch,
	};
}

const entry = (overrides: Partial<BanEntry> = {}): BanEntry => ({
	userId: SAM,
	username: "sam",
	avatarUrl: null,
	reason: "spamming invites",
	softbanEndsAt: null,
	...overrides,
});

describe("banMatches", () => {
	it("matches an ID or a mention exactly, and a name or reason anywhere", () => {
		expect(banMatches(entry(), SAM)).toBe(true);
		expect(banMatches(entry(), `<@${SAM}>`)).toBe(true);
		expect(banMatches(entry(), "100000000000000002")).toBe(false);
		expect(banMatches(entry(), "SA")).toBe(true);
		expect(banMatches(entry(), "invites")).toBe(true);
		expect(banMatches(entry(), "")).toBe(true);
	});
});

describe("readBans", () => {
	beforeEach(() => {
		jest.mocked(listActiveSoftbans).mockResolvedValue([]);
	});

	it("says it cannot read bans without Ban Members, and never asks Discord", async () => {
		const { guild, fetch } = guildWith([banOf(1)], []);

		expect(await readBans(guild, { page: 1, query: "" })).toEqual(
			expect.objectContaining({ readable: false, items: [] }),
		);
		expect(fetch).not.toHaveBeenCalled();
	});

	it("pages a search, and keeps a page past the end on the last one", async () => {
		const bans = Array.from({ length: BAN_LIMITS.perPage + 3 }, (_, index) => banOf(index + 1));
		const { guild } = guildWith(bans);

		const last = await readBans(guild, { page: 9, query: "" });
		expect(last).toEqual(expect.objectContaining({ page: 2, total: BAN_LIMITS.perPage + 3, truncated: false }));
		expect(last.items).toHaveLength(3);

		const searched = await readBans(guild, { page: 1, query: "user0002" });
		expect(searched.items.map((ban) => ban.username)).toEqual(["user0002"]);
	});

	/** A softban lifts itself, so the list has to say when rather than look like a ban for ever. */
	it("marks a softban with when it lifts", async () => {
		const [id] = banOf(1);
		jest
			.mocked(listActiveSoftbans)
			.mockResolvedValue([{ userId: id, expiresAt: new Date("2026-11-01T00:00:00.000Z") } as never]);
		const { guild } = guildWith([banOf(1, "Softban"), banOf(2)]);

		const page = await readBans(guild, { page: 1, query: "" });

		expect(page.items.map((ban) => ban.softbanEndsAt)).toEqual(["2026-11-01T00:00:00.000Z", null]);
	});

	it("says when there are more bans than one read returns", async () => {
		const { guild } = guildWith(Array.from({ length: BAN_LIMITS.maxRead }, (_, index) => banOf(index + 1)));

		expect((await readBans(guild, { page: 1, query: "" })).truncated).toBe(true);
	});
});
