import { AFK } from "@config/constants";
import { setAfk } from "@database/repositories/afkRepository";
import { goAway } from "@lib/afk/afk.util";

jest.mock("@database/repositories/afkRepository", () => ({
	setAfk: jest.fn((_guildId: string, userId: string, note: string) =>
		Promise.resolve({ userId, note, updatedAt: new Date(0) }),
	),
}));

const GUILD = "900000000000000001";

describe("goAway", () => {
	/** A note is shown to whoever mentions its member, so what makes text read differently is stripped first. */
	it("strips invisible characters and squashes the note onto one line", async () => {
		await goAway(GUILD, "1", " back​ at\nsix ");

		expect(setAfk).toHaveBeenCalledWith(GUILD, "1", "back at six");
	});

	it("refuses a note longer than the command allows", async () => {
		await expect(goAway(GUILD, "1", "x".repeat(AFK.maxNote + 1))).rejects.toThrow("Keep your note to 100 characters.");
	});
});
