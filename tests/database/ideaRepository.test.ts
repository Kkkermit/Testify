import { describeWithMongo } from "../helpers/mongo";
import {
	countIdeas,
	createIdea,
	decideIdea,
	deleteIdea,
	findIdea,
	getIdeaSettings,
	lastIdeaAt,
	listIdeas,
	saveIdeaSettings,
	takeIdeaNumber,
	voteOnIdea,
} from "@database/repositories/ideaRepository";
import { purgeGuild } from "@database/repositories/settingsRepository";

const GUILD = "900000000000000001";
const OTHER = "900000000000000002";
const ALICE = "100000000000000001";
const BOB = "100000000000000002";

async function post(guildId = GUILD, text = "A pets channel"): Promise<string> {
	const idea = await createIdea({
		guildId,
		number: await takeIdeaNumber(guildId),
		channelId: "400000000000000001",
		authorId: ALICE,
		authorName: "alice",
		text,
	});
	return idea.id;
}

const DECISION = { reason: "Yes", by: BOB, byName: "bob", at: new Date("2026-10-23T12:00:00.000Z") };

describeWithMongo("ideaRepository", () => {
	/** Two ideas posted at once must never share a number, which is what people refer to them by. */
	it("numbers each server's ideas from one, without gaps or repeats", async () => {
		const numbers = await Promise.all(Array.from({ length: 5 }, () => takeIdeaNumber(GUILD)));

		expect(numbers.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
		expect(await takeIdeaNumber(OTHER)).toBe(1);
	});

	it("keeps the board's switch and channel, and the counter, apart", async () => {
		await takeIdeaNumber(GUILD);
		await saveIdeaSettings(GUILD, { enabled: true, channelId: "400000000000000001" }, ALICE);

		expect(await getIdeaSettings(GUILD)).toMatchObject({ enabled: true, channelId: "400000000000000001" });
		expect(await takeIdeaNumber(GUILD)).toBe(2);
	});

	it("counts a vote once, takes it back on a second press, and moves it to the other side", async () => {
		const id = await post();

		expect((await voteOnIdea(GUILD, id, BOB, "up"))?.upVoters).toEqual([BOB]);
		expect((await voteOnIdea(GUILD, id, BOB, "up"))?.upVoters).toEqual([]);

		await voteOnIdea(GUILD, id, BOB, "up");
		const moved = await voteOnIdea(GUILD, id, BOB, "down");
		expect(moved?.upVoters).toEqual([]);
		expect(moved?.downVoters).toEqual([BOB]);
	});

	it("closes voting once an idea is decided, and opens it again when reopened", async () => {
		const id = await post();
		await decideIdea(GUILD, id, { ...DECISION, status: "accepted" });

		expect(await voteOnIdea(GUILD, id, BOB, "up")).toBeNull();

		const reopened = await decideIdea(GUILD, id, { ...DECISION, status: "open" });
		expect(reopened).toMatchObject({ status: "open", reason: "", decidedBy: null });
		expect((await voteOnIdea(GUILD, id, BOB, "up"))?.upVoters).toEqual([BOB]);
	});

	/** An id from one server's post must never reach another server's idea. */
	it("never finds, votes on, decides or deletes another server's idea", async () => {
		const theirs = await post(OTHER);

		expect(await findIdea(GUILD, theirs)).toBeNull();
		expect(await voteOnIdea(GUILD, theirs, BOB, "up")).toBeNull();
		expect(await decideIdea(GUILD, theirs, { ...DECISION, status: "declined" })).toBeNull();
		expect(await deleteIdea(GUILD, theirs)).toBeNull();
		expect((await findIdea(OTHER, theirs))?.status).toBe("open");
	});

	it("answers no for an id that is not one, rather than throwing", async () => {
		expect(await findIdea(GUILD, "$where")).toBeNull();
		expect(await voteOnIdea(GUILD, "nope", BOB, "up")).toBeNull();
	});

	it("lists newest first, by status, and counts each status", async () => {
		const first = await post(GUILD, "first");
		await post(GUILD, "second");
		await decideIdea(GUILD, first, { ...DECISION, status: "declined" });

		const all = await listIdeas(GUILD, "all", { skip: 0, limit: 10 });
		expect(all.items.map((idea) => idea.text)).toEqual(["second", "first"]);
		expect((await listIdeas(GUILD, "declined", { skip: 0, limit: 10 })).total).toBe(1);
		expect(await countIdeas(GUILD)).toEqual({ open: 1, accepted: 0, declined: 1 });
	});

	it("knows when a member last posted", async () => {
		expect(await lastIdeaAt(GUILD, ALICE)).toBeNull();
		await post();
		expect(await lastIdeaAt(GUILD, ALICE)).toBeInstanceOf(Date);
		expect(await lastIdeaAt(OTHER, ALICE)).toBeNull();
	});

	it("goes when the bot leaves the server", async () => {
		await post();
		await saveIdeaSettings(GUILD, { enabled: true, channelId: "400000000000000001" }, ALICE);
		await post(OTHER);

		await purgeGuild(GUILD);

		expect(await countIdeas(GUILD)).toEqual({ open: 0, accepted: 0, declined: 0 });
		expect(await getIdeaSettings(GUILD)).toBeNull();
		expect((await countIdeas(OTHER)).open).toBe(1);
	});
});
