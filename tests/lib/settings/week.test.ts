import { type Guild } from "discord.js";
import { type TestifyClient } from "@core/client";
import { listBirthdays } from "@database/repositories/birthdayRepository";
import { listSchedules } from "@database/repositories/scheduledMessageRepository";
import { readBirthdaySettings } from "@lib/birthdays/birthdayActions.util";
import { readLottery } from "@lib/economy/lotteryActions.util";
import { listGiveaways } from "@lib/giveaways/giveawayActions.util";
import { birthdayAt, readWeek, scheduleTimes } from "@lib/settings/week.util";

jest.mock("@database/repositories/birthdayRepository", () => ({ listBirthdays: jest.fn() }));
jest.mock("@database/repositories/scheduledMessageRepository", () => ({ listSchedules: jest.fn() }));
jest.mock("@lib/birthdays/birthdayActions.util", () => ({ readBirthdaySettings: jest.fn() }));
jest.mock("@lib/economy/lotteryActions.util", () => ({ readLottery: jest.fn() }));
jest.mock("@lib/giveaways/giveawayActions.util", () => ({ listGiveaways: jest.fn() }));

const NOW = new Date("2026-08-03T12:00:00.000Z");
const WEEK_ON = new Date("2026-08-10T12:00:00.000Z");
const hours = (n: number): Date => new Date(NOW.getTime() + n * 3_600_000);

describe("scheduleTimes", () => {
	/** A daily post is seven events in a week, a one-off is one, and a post already due is about to go out. */
	it("lists every time a post goes out inside the week, and no more", () => {
		const rows = [
			scheduleTimes({ nextAt: hours(1), repeat: "daily" }, NOW, WEEK_ON).length,
			scheduleTimes({ nextAt: hours(1), repeat: "once" }, NOW, WEEK_ON).length,
			scheduleTimes({ nextAt: hours(200), repeat: "weekly" }, NOW, WEEK_ON).length,
			scheduleTimes({ nextAt: hours(-30), repeat: "daily" }, NOW, WEEK_ON)[0]?.toISOString(),
		];

		expect(rows).toEqual([7, 1, 0, hours(18).toISOString()]);
	});
});

describe("birthdayAt", () => {
	it("counts today and the next six days, and nothing past them", () => {
		expect(birthdayAt(3, 8, NOW)?.toISOString()).toBe("2026-08-03T00:00:00.000Z");
		expect(birthdayAt(9, 8, NOW)?.toISOString()).toBe("2026-08-09T00:00:00.000Z");
		expect(birthdayAt(10, 8, NOW)).toBeNull();
	});
});

describe("readWeek", () => {
	const guild = { id: "900000000000000001", members: { cache: new Map() } } as unknown as Guild;

	beforeEach(() => {
		jest
			.mocked(listSchedules)
			.mockResolvedValue([
				{ id: "s1", guildId: guild.id, channelId: "c1", message: "Hello", repeat: "once", nextAt: hours(5) },
			]);
		jest.mocked(listGiveaways).mockResolvedValue([
			{ messageId: "g1", channelId: "c1", prize: "Nitro", endAt: hours(2).toISOString(), ended: false },
			{ messageId: "g2", channelId: "c1", prize: "Old", endAt: hours(3).toISOString(), ended: true },
		] as never);
		jest.mocked(listBirthdays).mockResolvedValue([{ userId: "u1", username: "kate", day: 4, month: 8 }] as never);
	});

	/** A frozen lottery does not draw, and a birthday the server does not mark is not something the bot does. */
	it("leaves out what will not happen, and puts the rest soonest first", async () => {
		jest
			.mocked(readLottery)
			.mockResolvedValue({ enabled: true, frozen: true, nextDrawAt: hours(4).toISOString() } as never);
		jest.mocked(readBirthdaySettings).mockResolvedValue({ enabled: false } as never);

		const week = await readWeek({} as TestifyClient, guild, NOW);

		expect(week.events.map((event) => event.kind)).toEqual(["giveaway", "scheduled"]);
	});

	it("adds the draw and the birthdays when both will happen", async () => {
		jest.mocked(readLottery).mockResolvedValue({
			enabled: true,
			frozen: false,
			prizePool: 500,
			nextDrawAt: hours(4).toISOString(),
		} as never);
		jest.mocked(readBirthdaySettings).mockResolvedValue({ enabled: true } as never);

		const week = await readWeek({} as TestifyClient, guild, NOW);

		expect(week.events.map((event) => event.kind)).toEqual(["giveaway", "lottery", "scheduled", "birthday"]);
	});
});
