import { describeWithMongo } from "../helpers/mongo";
import { HOUR_MS, MINUTE_MS } from "@config/constants";
import { ScheduledPost } from "@database/models/scheduledMessage.schema";
import {
	claimDueSchedule,
	createSchedule,
	deleteSchedule,
	findSchedule,
	listSchedules,
	purgeSchedules,
	settleSchedule,
	updateSchedule,
} from "@database/repositories/scheduledMessageRepository";

const GUILD = "900000000000000001";
const OTHER = "900000000000000002";
const CHANNEL = "400000000000000001";
const BY = "100000000000000001";
const NOW = new Date("2026-10-25T12:00:00.000Z");
const LEASE = 2 * MINUTE_MS;
const at = (offsetMs: number): Date => new Date(NOW.getTime() + offsetMs);

const fields = (nextAt: Date) => ({ channelId: CHANNEL, message: "Hello", repeat: "daily" as const, nextAt });

describeWithMongo("scheduledMessageRepository", () => {
	it("lists a server's schedules soonest first, and only that server's", async () => {
		await createSchedule(GUILD, fields(at(2 * HOUR_MS)), BY);
		await createSchedule(GUILD, fields(at(HOUR_MS)), BY);
		await createSchedule(OTHER, fields(at(HOUR_MS)), BY);

		expect((await listSchedules(GUILD)).map((entry) => entry.nextAt)).toEqual([at(HOUR_MS), at(2 * HOUR_MS)]);
	});

	/** Every lookup filters on the server, so a manager of one can never change another's. */
	it("keeps each server's schedules apart", async () => {
		const mine = await createSchedule(GUILD, fields(at(HOUR_MS)), BY);

		expect(await findSchedule(OTHER, mine.id)).toBeNull();
		expect(await updateSchedule(OTHER, mine.id, { message: "Hijacked" }, BY)).toBeNull();
		expect(await deleteSchedule(OTHER, mine.id)).toBe(false);
		expect((await findSchedule(GUILD, mine.id))?.message).toBe("Hello");
	});

	/** The lease is what stops two runs posting the same message twice. */
	it("hands a due post to one run at a time, and again once the lease runs out", async () => {
		await createSchedule(GUILD, fields(at(-MINUTE_MS)), BY);

		expect(await claimDueSchedule(NOW, LEASE)).not.toBeNull();
		expect(await claimDueSchedule(NOW, LEASE)).toBeNull();
		expect(await claimDueSchedule(at(LEASE), LEASE)).not.toBeNull();
	});

	it("leaves posts that are not due yet alone", async () => {
		await createSchedule(GUILD, fields(at(MINUTE_MS)), BY);

		expect(await claimDueSchedule(NOW, LEASE)).toBeNull();
	});

	it("moves a repeating post on, and deletes a one-off once it is sent", async () => {
		await createSchedule(GUILD, fields(at(-MINUTE_MS)), BY);
		const daily = await claimDueSchedule(NOW, LEASE);
		await settleSchedule(daily!, at(HOUR_MS));

		expect((await listSchedules(GUILD))[0]?.nextAt).toEqual(at(HOUR_MS));
		expect(await claimDueSchedule(NOW, LEASE)).toBeNull();

		await settleSchedule((await listSchedules(GUILD))[0]!, null);
		expect(await listSchedules(GUILD)).toEqual([]);
	});

	/** A manager who reschedules while it is being posted must not have the change overwritten or deleted. */
	it("keeps an edit made while the post was being sent", async () => {
		const created = await createSchedule(GUILD, fields(at(-MINUTE_MS)), BY);
		const claimed = await claimDueSchedule(NOW, LEASE);

		await updateSchedule(GUILD, created.id, { nextAt: at(3 * HOUR_MS) }, BY);
		await settleSchedule(claimed!, null);

		expect((await findSchedule(GUILD, created.id))?.nextAt).toEqual(at(3 * HOUR_MS));
	});

	it("releases the claim when a post is edited, so it posts at its new time", async () => {
		const created = await createSchedule(GUILD, fields(at(-MINUTE_MS)), BY);
		await claimDueSchedule(NOW, LEASE);

		await updateSchedule(GUILD, created.id, { message: "Edited" }, BY);

		expect((await claimDueSchedule(NOW, LEASE))?.message).toBe("Edited");
	});

	it("forgets a server it leaves, and only that server", async () => {
		await createSchedule(GUILD, fields(at(HOUR_MS)), BY);
		await createSchedule(OTHER, fields(at(HOUR_MS)), BY);

		await purgeSchedules(GUILD);

		expect(await ScheduledPost.countDocuments({ guildId: GUILD })).toBe(0);
		expect(await listSchedules(OTHER)).toHaveLength(1);
	});
});
