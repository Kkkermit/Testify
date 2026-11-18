import {
	birthdaysDue,
	claimBirthday,
	forgetBirthday,
	getBirthdaySettings,
	releaseBirthday,
	type StoredBirthday,
} from "@database/repositories/birthdayRepository";
import { announceBirthdays } from "@jobs/birthdays.util";
import { postBirthday } from "@lib/birthdays";
import { createMockClient } from "@tests/helpers/mocks";

jest.mock("@database/repositories/birthdayRepository", () => ({
	birthdaysDue: jest.fn(),
	claimBirthday: jest.fn(() => Promise.resolve(true)),
	forgetBirthday: jest.fn(() => Promise.resolve(true)),
	getBirthdaySettings: jest.fn(),
	releaseBirthday: jest.fn(() => Promise.resolve()),
}));
jest.mock("@lib/birthdays", () => ({
	...jest.requireActual<object>("@lib/birthdays"),
	postBirthday: jest.fn(() => Promise.resolve("sent")),
}));

const NOW = new Date("2026-10-25T00:30:00.000Z");
const ON = { enabled: true, channelId: "400000000000000001", message: "Happy birthday, {user}!" };

const birthday = (guildId: string, userId: string): StoredBirthday => ({
	guildId,
	userId,
	username: "sam",
	day: 25,
	month: 10,
});

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(getBirthdaySettings).mockResolvedValue(ON);
	jest.mocked(claimBirthday).mockResolvedValue(true);
	jest.mocked(postBirthday).mockResolvedValue("sent");
});

describe("announcing today's birthdays", () => {
	it("asks for today's date in UTC and this year, and posts each one it claims", async () => {
		jest.mocked(birthdaysDue).mockResolvedValue([birthday("1", "a"), birthday("1", "b")]);

		await announceBirthdays(createMockClient(), NOW);

		expect(birthdaysDue).toHaveBeenCalledWith([{ day: 25, month: 10 }], 2026);
		expect(postBirthday).toHaveBeenCalledTimes(2);
		expect(getBirthdaySettings).toHaveBeenCalledTimes(1);
	});

	/** A server that never turned posts on has its members' birthdays left unclaimed, not used up. */
	it("leaves a server with posts off alone, without claiming anything", async () => {
		jest.mocked(birthdaysDue).mockResolvedValue([birthday("1", "a")]);
		jest.mocked(getBirthdaySettings).mockResolvedValue({ ...ON, enabled: false });

		await announceBirthdays(createMockClient(), NOW);

		expect(claimBirthday).not.toHaveBeenCalled();
		expect(postBirthday).not.toHaveBeenCalled();
	});

	it("posts nothing that another run already claimed", async () => {
		jest.mocked(birthdaysDue).mockResolvedValue([birthday("1", "a")]);
		jest.mocked(claimBirthday).mockResolvedValue(false);

		await announceBirthdays(createMockClient(), NOW);

		expect(postBirthday).not.toHaveBeenCalled();
	});

	it("forgets somebody who has left, rather than posting about them", async () => {
		jest.mocked(birthdaysDue).mockResolvedValue([birthday("1", "a")]);
		jest.mocked(postBirthday).mockResolvedValue("gone");

		await announceBirthdays(createMockClient(), NOW);

		expect(forgetBirthday).toHaveBeenCalledWith("1", "a");
	});

	/** Handing the claim back is what lets a channel fixed later that day still get its post. */
	it("hands the claim back when the post did not go out", async () => {
		jest.mocked(birthdaysDue).mockResolvedValue([birthday("1", "a"), birthday("1", "b")]);
		jest.mocked(postBirthday).mockResolvedValueOnce("unreachable").mockRejectedValueOnce(new Error("Discord is down"));
		const client = createMockClient();
		const warn = jest.spyOn(client.logger, "warn");

		await announceBirthdays(client, NOW);

		expect(jest.mocked(releaseBirthday).mock.calls).toEqual([
			["1", "a", 2026],
			["1", "b", 2026],
		]);
		expect(warn).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("[BIRTHDAYS]"));
	});
});
