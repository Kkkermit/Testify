import { type TestifyClient } from "@core/client";
import { eraseUserData } from "@database/repositories/accountRepository";
import { eraseAccount } from "@lib/account/accountActions.util";
import { activity } from "@lib/info/activity.util";

jest.mock("@database/repositories/accountRepository", () => ({
	eraseUserData: jest.fn(() =>
		Promise.resolve([
			{ channelId: "400000000000000001", messageId: "500000000000000001" },
			{ channelId: "400000000000000002", messageId: "500000000000000002" },
		]),
	),
}));

const PERSON = "100000000000000001";

function clientWith(fetchChannel: (id: string) => Promise<unknown>): TestifyClient {
	return {
		channels: { fetch: jest.fn(fetchChannel) },
		logger: { debug: jest.fn(), info: jest.fn() },
	} as unknown as TestifyClient;
}

describe("eraseAccount", () => {
	/** An idea's post quotes somebody's words, so it goes with the record that held them. */
	it("takes down the idea posts, and one Discord refuses does not stop the rest", async () => {
		const deleted: string[] = [];
		const client = clientWith((id) =>
			id === "400000000000000001"
				? Promise.reject(new Error("Missing Access"))
				: Promise.resolve({
						isTextBased: () => true,
						messages: { delete: (messageId: string) => Promise.resolve(void deleted.push(messageId)) },
					}),
		);

		await eraseAccount(client, PERSON);

		expect(jest.mocked(eraseUserData)).toHaveBeenCalledWith(PERSON);
		expect(deleted).toEqual(["500000000000000002"]);
	});

	/** Counts held in memory would write a fresh row about them on the next flush. */
	it("forgets the messages counted for them but not yet written", async () => {
		const client = clientWith(() => Promise.resolve(null));
		activity.count({ guildId: "900000000000000001", channelId: "400000000000000001", userId: PERSON });
		activity.count({ guildId: "900000000000000001", channelId: "400000000000000001", userId: "100000000000000002" });

		await eraseAccount(client, PERSON);

		expect(activity.drain().members.map((member) => member.userId)).toEqual(["100000000000000002"]);
	});
});
