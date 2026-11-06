import mongoose from "mongoose";
import { describeWithMongo } from "../helpers/mongo";

describeWithMongo("the test database", () => {
	/** A run fixture dated 1 August expired on 31 August, and the TTL sweep then deleted it while its test still ran. */
	it("never deletes expired fixtures in the middle of a test", async () => {
		const answer = await mongoose.connection.db?.admin().command({ getParameter: 1, ttlMonitorEnabled: 1 });

		expect(answer?.["ttlMonitorEnabled"]).toBe(false);
	});
});
