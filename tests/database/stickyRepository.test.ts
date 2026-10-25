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
		await setSticky(GUILD, CHANNEL, "Read the rules", 3);

		const results = await Promise.all(Array.from({ length: 6 }, async () => bumpSticky(GUILD, CHANNEL)));

		expect(results.filter((result) => result !== null)).toHaveLength(1);
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
