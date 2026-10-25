import { describeWithMongo } from "../helpers/mongo";
import { ModCaseCounter, ModCaseEntry } from "@database/models/modCase.schema";
import {
	createCase,
	findCase,
	getCaseSettings,
	listCases,
	nextCaseNumber,
	purgeCaseSettings,
	saveCaseSettings,
} from "@database/repositories/caseRepository";

const GUILD = "900000000000000001";
const OTHER = "900000000000000002";
const SAM = "100000000000000001";
const KIT = "100000000000000002";

const fields = (userId: string, action: "warn" | "ban" = "warn") => ({
	action,
	userId,
	username: userId === SAM ? "sam" : "kit",
	moderatorId: "100000000000000009",
	moderatorName: "mod",
	reason: "spam",
	durationMs: null,
});

describeWithMongo("caseRepository", () => {
	/** One `$inc` per number, so actions taken at the same moment can never share one. */
	it("numbers each server's cases from one, without repeats, even all at once", async () => {
		const numbers = await Promise.all(Array.from({ length: 12 }, () => nextCaseNumber(GUILD)));

		expect([...numbers].sort((a, b) => a - b)).toEqual(Array.from({ length: 12 }, (_, index) => index + 1));
		expect(await nextCaseNumber(OTHER)).toBe(1);
	});

	it("lists newest first, for the server or for one member, and finds one by number", async () => {
		await createCase(GUILD, await nextCaseNumber(GUILD), fields(SAM));
		await createCase(GUILD, await nextCaseNumber(GUILD), fields(KIT, "ban"));
		await createCase(OTHER, await nextCaseNumber(OTHER), fields(SAM));

		expect((await listCases(GUILD)).map((entry) => entry.number)).toEqual([2, 1]);
		expect((await listCases(GUILD, KIT)).map((entry) => entry.action)).toEqual(["ban"]);
		expect(await findCase(GUILD, 2)).toEqual(expect.objectContaining({ userId: KIT, action: "ban" }));
		expect(await findCase(OTHER, 2)).toBeNull();
	});

	it("refuses a number already used in that server", async () => {
		await createCase(GUILD, 1, fields(SAM));

		await expect(createCase(GUILD, 1, fields(KIT))).rejects.toThrow();
	});

	/** Cases are member records, kept like warnings; only the log channel goes with the bot. */
	it("forgets the log channel when the bot leaves, and keeps the cases and their numbering", async () => {
		await saveCaseSettings(GUILD, "400000000000000001", SAM);
		await createCase(GUILD, await nextCaseNumber(GUILD), fields(SAM));

		await purgeCaseSettings(GUILD);

		expect(await getCaseSettings(GUILD)).toBeNull();
		expect(await ModCaseEntry.countDocuments({ guildId: GUILD })).toBe(1);
		expect(await ModCaseCounter.countDocuments({ guildId: GUILD })).toBe(1);
		expect(await nextCaseNumber(GUILD)).toBe(2);
	});
});
