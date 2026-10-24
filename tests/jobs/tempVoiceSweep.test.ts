import { type TestifyClient } from "@core/client";
import { sweepTempVoice } from "@jobs/tempVoiceSweep.util";
import { sweepTempChannels } from "@lib/tempVoice";

jest.mock("@lib/tempVoice", () => ({ sweepTempChannels: jest.fn(() => Promise.resolve()) }));

describe("sweepTempVoice", () => {
	it("sweeps the made channels with the client it was scheduled with", async () => {
		const client = {} as TestifyClient;

		await sweepTempVoice(client);

		expect(sweepTempChannels).toHaveBeenCalledWith(client);
	});
});
