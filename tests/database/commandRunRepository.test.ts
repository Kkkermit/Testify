import { describeWithMongo } from "../helpers/mongo";
import { CommandRuns } from "@database/models/commandRuns.schema";
import {
	memberTallies,
	recentRuns,
	recordCommandRun,
	type RunRecord,
} from "@database/repositories/commandRunRepository";
import { RUN_RETENTION_DAYS } from "@testify/shared";

const GUILD = "900000000000000001";
const OTHER = "900000000000000002";
const ALICE = "800000000000000001";
const BOB = "800000000000000002";
const TODAY = new Date("2026-08-01T12:00:00.000Z");
const PAGE = { skip: 0, limit: 25 };

describeWithMongo("commandRunRepository", () => {
	async function ran(overrides: Partial<RunRecord> = {}, at = TODAY): Promise<void> {
		await recordCommandRun(
			{
				guildId: GUILD,
				channelId: "700000000000000001",
				userId: ALICE,
				username: "alice",
				command: "rank",
				subcommand: null,
				surface: "slash",
				failed: false,
				durationMs: 10,
				...overrides,
			},
			at,
		);
	}

	/** Who ran what names a person, so it goes after a month rather than with the ninety-day counts. */
	it("expires a run after the shorter retention", async () => {
		await ran();

		const row = await CommandRuns.findOne({}).lean();
		expect(row?.expiresAt.getTime()).toBe(TODAY.getTime() + RUN_RETENTION_DAYS * 24 * 60 * 60 * 1000);
	});

	it("tallies each member, busiest first, with their commands busiest first", async () => {
		await ran({ userId: BOB, username: "bob" });
		await ran({ command: "rank" });
		await ran({ command: "rank", failed: true });
		await ran({ command: "balance", surface: "prefix" });

		const [first, second] = await memberTallies(GUILD, 7, TODAY);

		expect(first).toMatchObject({
			userId: ALICE,
			username: "alice",
			runs: 3,
			failures: 1,
			prefix: 1,
			commands: [
				{ command: "rank", count: 2 },
				{ command: "balance", count: 1 },
			],
		});
		expect(second).toMatchObject({ userId: BOB, runs: 1 });
	});

	/** Somebody who renamed themselves is shown as they are now, not as whichever name the database met first. */
	it("names a member by their most recent run", async () => {
		await ran({ username: "old-name" }, new Date("2026-07-30T09:00:00.000Z"));
		await ran({ username: "new-name" }, TODAY);
		await ran({ username: "middle-name", command: "balance" }, new Date("2026-07-31T09:00:00.000Z"));

		const [member] = await memberTallies(GUILD, 7, TODAY);
		expect(member?.username).toBe("new-name");
		expect(member?.lastAt.toISOString()).toBe(TODAY.toISOString());
	});

	it("keeps each server's members to itself and leaves out runs past the window", async () => {
		await ran({ guildId: OTHER, userId: BOB });
		await ran({}, new Date("2026-06-01T09:00:00.000Z"));

		expect(await memberTallies(GUILD, 7, TODAY)).toEqual([]);
		expect(await memberTallies(GUILD, 90, TODAY)).toHaveLength(1);
	});

	it("lists runs newest first, a page at a time", async () => {
		await ran({ command: "first" }, new Date("2026-07-31T09:00:00.000Z"));
		await ran({ command: "second" }, new Date("2026-07-31T10:00:00.000Z"));
		await ran({ command: "third" }, TODAY);

		const { items, total } = await recentRuns(GUILD, 7, {}, { skip: 1, limit: 1 }, TODAY);

		expect(total).toBe(3);
		expect(items.map((item) => item.command)).toEqual(["second"]);
	});

	it("narrows the runs to one member or one command", async () => {
		await ran({ userId: BOB, command: "rank" });
		await ran({ command: "balance" });
		await ran({ command: "rank" });

		const bob = await recentRuns(GUILD, 7, { userId: BOB }, PAGE, TODAY);
		const rank = await recentRuns(GUILD, 7, { command: "rank" }, PAGE, TODAY);
		const both = await recentRuns(GUILD, 7, { userId: ALICE, command: "rank" }, PAGE, TODAY);

		expect(bob.total).toBe(1);
		expect(rank.total).toBe(2);
		expect(both.total).toBe(1);
	});

	it("never lists another server's runs", async () => {
		await ran({ guildId: OTHER });

		expect(await recentRuns(GUILD, 7, {}, PAGE, TODAY)).toEqual({ items: [], total: 0 });
	});
});
