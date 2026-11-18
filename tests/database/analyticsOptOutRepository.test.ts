import { describeWithMongo } from "../helpers/mongo";
import { isOptedOut, readOptOuts, saveOptOut } from "@database/repositories/analyticsOptOutRepository";

const SAM = "100000000000000001";
const KIT = "100000000000000002";

describeWithMongo("analyticsOptOutRepository", () => {
	/** The list is what Shardlens starts with, so an opt-out has to come back after a restart. */
	it("keeps an opt-out until it is taken back", async () => {
		await saveOptOut(SAM, true);

		expect(await readOptOuts()).toEqual([SAM]);
		expect(await isOptedOut(SAM)).toBe(true);
		expect(await isOptedOut(KIT)).toBe(false);

		await saveOptOut(SAM, false);

		expect(await readOptOuts()).toEqual([]);
		expect(await isOptedOut(SAM)).toBe(false);
	});

	it("keeps one record when the same choice is made twice, or twice at once", async () => {
		await Promise.all([saveOptOut(SAM, true), saveOptOut(SAM, true)]);
		await saveOptOut(SAM, true);
		await saveOptOut(KIT, false);

		expect(await readOptOuts()).toEqual([SAM]);
	});
});
