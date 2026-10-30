import { describeWithMongo } from "../helpers/mongo";
import { bumpSticky, listSticky, removeSticky, setSticky } from "@database/repositories/stickyRepository";

const GUILD = "900000000000000001";
const CHANNEL = "400000000000000001";

describeWithMongo("stickyRepository", () => {
	it("says nothing until the cap is reached, then hands back the sticky and starts over", async () => {
		await setSticky(GUILD, CHANNEL, "Read the rules", 3);

		expect(await bumpSticky(GUILD, CHANNEL)).toBeNull();
		expect(await bumpSticky(GUILD, CHANNEL)).toBeNull();
		expect(await bumpSticky(GUILD, CHANNEL)).toMatchObject({ message: "Read the rules", count: 0 });
		expect(await bumpSticky(GUILD, CHANNEL)).toBeNull();
	});

	/** A burst of messages arriving together must repost the sticky once, not once per message past the cap. */
	it("reposts once however many messages cross the cap together", async () => {
		const reposts: number[] = [];
		// One burst after another, because the first on a fresh connection tends to arrive a message at a time.
		for (const channel of ["400000000000000011", "400000000000000012", "400000000000000013", "400000000000000014"]) {
			await setSticky(GUILD, channel, "Read the rules", 3);
			// One short of twice the cap: six can rightly cross it twice, when a reset lands between the third and fourth.
			const results = await Promise.all(Array.from({ length: 5 }, async () => bumpSticky(GUILD, channel)));
			reposts.push(results.filter((result) => result !== null).length);
		}

		expect(reposts).toEqual([1, 1, 1, 1]);
	});

	it("does nothing in a channel with no sticky", async () => {
		expect(await bumpSticky(GUILD, CHANNEL)).toBeNull();
	});

	it("keeps one sticky per channel, and changing it keeps its place in the count", async () => {
		await setSticky(GUILD, CHANNEL, "Read the rules", 3);
		await bumpSticky(GUILD, CHANNEL);
		await setSticky(GUILD, CHANNEL, "Read the new rules", 5);

		expect(await listSticky(GUILD)).toEqual([
			expect.objectContaining({ message: "Read the new rules", cap: 5, count: 1 }),
		]);
		expect(await removeSticky(GUILD, CHANNEL)).toBe(true);
		expect(await removeSticky(GUILD, CHANNEL)).toBe(false);
	});
});
