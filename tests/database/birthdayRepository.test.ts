import { describeWithMongo } from "../helpers/mongo";
import { BirthdaySettingsConfig, SharedBirthday } from "@database/models/birthday.schema";
import {
	birthdaysDue,
	claimBirthday,
	findBirthday,
	forgetBirthday,
	getBirthdaySettings,
	purgeBirthdays,
	releaseBirthday,
	saveBirthdaySettings,
	shareBirthday,
} from "@database/repositories/birthdayRepository";

const GUILD = "900000000000000001";
const OTHER = "900000000000000002";
const SAM = "100000000000000001";
const KIT = "100000000000000002";
const TODAY = [{ day: 25, month: 10 }];

describeWithMongo("birthdayRepository", () => {
	it("keeps one birthday per member per server, the newest", async () => {
		await shareBirthday(GUILD, SAM, "sam", 1, 1);
		await shareBirthday(GUILD, SAM, "sam", 25, 10);

		expect(await findBirthday(GUILD, SAM)).toEqual(expect.objectContaining({ day: 25, month: 10 }));
		expect(await SharedBirthday.countDocuments({ guildId: GUILD })).toBe(1);
	});

	/** Sharing with one server says nothing to another. */
	it("keeps each server's birthdays apart", async () => {
		await shareBirthday(GUILD, SAM, "sam", 25, 10);

		expect(await findBirthday(OTHER, SAM)).toBeNull();
		expect(await forgetBirthday(OTHER, SAM)).toBe(false);
	});

	it("finds today's birthdays across servers, until they are posted this year", async () => {
		await shareBirthday(GUILD, SAM, "sam", 25, 10);
		await shareBirthday(OTHER, KIT, "kit", 25, 10);
		await shareBirthday(GUILD, KIT, "kit", 26, 10);

		expect((await birthdaysDue(TODAY, 2026)).map((entry) => entry.userId).sort()).toEqual([SAM, KIT].sort());

		await claimBirthday(GUILD, SAM, 2026);
		expect((await birthdaysDue(TODAY, 2026)).map((entry) => entry.userId)).toEqual([KIT]);
		expect(await birthdaysDue([], 2026)).toEqual([]);
	});

	/** The claim is the only thing stopping two runs on the same hour posting twice. */
	it("lets exactly one claim through per year, and hands it back when asked", async () => {
		await shareBirthday(GUILD, SAM, "sam", 25, 10);

		expect(await claimBirthday(GUILD, SAM, 2026)).toBe(true);
		expect(await claimBirthday(GUILD, SAM, 2026)).toBe(false);

		await releaseBirthday(GUILD, SAM, 2026);
		expect(await claimBirthday(GUILD, SAM, 2026)).toBe(true);
		expect(await claimBirthday(GUILD, SAM, 2027)).toBe(true);
	});

	it("does not post a moved birthday twice in one year", async () => {
		await shareBirthday(GUILD, SAM, "sam", 25, 10);
		await claimBirthday(GUILD, SAM, 2026);

		await shareBirthday(GUILD, SAM, "sam", 25, 10);

		expect(await birthdaysDue(TODAY, 2026)).toEqual([]);
	});

	it("starts a server off, and keeps what it saves", async () => {
		expect(await getBirthdaySettings(GUILD)).toBeNull();

		await saveBirthdaySettings(GUILD, { enabled: true, channelId: "400000000000000001" }, SAM);

		expect(await getBirthdaySettings(GUILD)).toEqual(
			expect.objectContaining({ enabled: true, channelId: "400000000000000001", message: expect.any(String) }),
		);
	});

	it("forgets a server it leaves, settings and birthdays, and only that server", async () => {
		await saveBirthdaySettings(GUILD, { enabled: true }, SAM);
		await shareBirthday(GUILD, SAM, "sam", 25, 10);
		await shareBirthday(OTHER, SAM, "sam", 25, 10);

		await purgeBirthdays(GUILD);

		expect(await BirthdaySettingsConfig.countDocuments({ guildId: GUILD })).toBe(0);
		expect(await findBirthday(GUILD, SAM)).toBeNull();
		expect(await findBirthday(OTHER, SAM)).not.toBeNull();
	});
});
