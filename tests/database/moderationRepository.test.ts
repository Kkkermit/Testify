import { describeWithMongo } from "../helpers/mongo";
import { getWarnings, recordWarning } from "@database/repositories/moderationRepository";

const GUILD = "111111111111111111";
const ALICE = "222222222222222222";
const MODERATOR = { id: "333333333333333333", tag: "mod" };

describeWithMongo("moderationRepository", () => {
	/** Counted by a second read, two warnings at once both saw two and both took the second step. */
	it("counts each of two warnings given at once from its own write", async () => {
		const [first, second] = await Promise.all([
			recordWarning(GUILD, ALICE, "alice", MODERATOR, "spam"),
			recordWarning(GUILD, ALICE, "alice", MODERATOR, "more spam"),
		]);

		expect([first.count, second.count].sort()).toEqual([1, 2]);
		expect((await getWarnings(GUILD, ALICE))?.warnings).toHaveLength(2);
	});

	it("counts only the warnings given since the window opened", async () => {
		const old = await recordWarning(GUILD, ALICE, "alice", MODERATOR, "old");
		await new Promise((resolve) => setTimeout(resolve, 5));

		const since = new Date(old.entry.timestamp.getTime() + 1);
		const { count } = await recordWarning(GUILD, ALICE, "alice", MODERATOR, "new", since);

		expect(count).toBe(1);
	});
});
