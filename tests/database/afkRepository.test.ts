import { describeWithMongo } from "../helpers/mongo";
import { clearAfk, clearAfkCache, findAway, purgeAfk, setAfk } from "@database/repositories/afkRepository";

const GUILD = "900000000000000001";
const OTHER = "900000000000000002";
const SAM = "100000000000000001";
const KIT = "100000000000000002";

describeWithMongo("afkRepository", () => {
	it("finds only the mentioned members who are away", async () => {
		await setAfk(GUILD, SAM, "lunch");

		expect(await findAway(GUILD, [SAM, KIT])).toEqual([expect.objectContaining({ userId: SAM, note: "lunch" })]);
		expect(await findAway(GUILD, [KIT])).toEqual([]);
		expect(await findAway(GUILD, [])).toEqual([]);
	});

	it("keeps one note per member per server, the newest", async () => {
		await setAfk(GUILD, SAM, "lunch");
		await setAfk(GUILD, SAM, "asleep");

		expect(await findAway(GUILD, [SAM])).toEqual([expect.objectContaining({ note: "asleep" })]);
	});

	/** Away in one server says nothing about another, where the member may be talking right now. */
	it("keeps each server's notes apart", async () => {
		await setAfk(GUILD, SAM, "lunch");

		expect(await findAway(OTHER, [SAM])).toEqual([]);
	});

	it("clears a note once, handing back what it said", async () => {
		await setAfk(GUILD, SAM, "lunch");

		expect(await clearAfk(GUILD, SAM)).toEqual(expect.objectContaining({ userId: SAM, note: "lunch" }));
		expect(await clearAfk(GUILD, SAM)).toBeNull();
		expect(await findAway(GUILD, [SAM])).toEqual([]);
	});

	/** The cache answers most messages, so it has to agree with the database after every write. */
	it("keeps the cache in step with writes made after it was filled", async () => {
		expect(await findAway(GUILD, [SAM])).toEqual([]);

		await setAfk(GUILD, SAM, "lunch");
		expect(await findAway(GUILD, [SAM])).toHaveLength(1);

		await clearAfk(GUILD, SAM);
		clearAfkCache();
		expect(await findAway(GUILD, [SAM])).toEqual([]);
	});

	it("forgets a server's notes when the bot leaves it", async () => {
		await setAfk(GUILD, SAM, "lunch");
		await setAfk(OTHER, SAM, "lunch");

		await purgeAfk(GUILD);

		expect(await findAway(GUILD, [SAM])).toEqual([]);
		expect(await findAway(OTHER, [SAM])).toHaveLength(1);
	});
});
