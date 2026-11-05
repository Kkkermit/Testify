import { type Guild } from "discord.js";
import { getAutoRoles } from "@database/repositories/autoRoleRepository";
import { getGoodbyeSettings } from "@database/repositories/goodbyeRepository";
import { getIdeaSettings } from "@database/repositories/ideaRepository";
import { getRaidSettings } from "@database/repositories/raidRepository";
import { listRoleMenus } from "@database/repositories/roleMenuRepository";
import { listSchedules } from "@database/repositories/scheduledMessageRepository";
import { getStarboardSettings } from "@database/repositories/starboardRepository";
import { getTempVoiceSettings } from "@database/repositories/tempVoiceRepository";
import { getVoiceCounter } from "@database/repositories/voiceCounterRepository";
import { getWelcome } from "@database/repositories/welcomeRepository";
import { readCasinoSettings } from "@lib/casino/casinoSettings.util";
import { readLottery } from "@lib/economy/lotteryActions.util";
import { FEATURE_SOURCES, featuresOf, placesOf } from "@lib/settings/featureStatus.util";
import { readTickets } from "@lib/tickets/ticketActions.util";
import { FEATURE_PLACES, type FeatureStatus } from "@testify/shared";

jest.mock("@database/repositories/ideaRepository", () => ({ getIdeaSettings: jest.fn() }));
jest.mock("@database/repositories/levelRepository", () => ({ getLevelSettings: jest.fn(() => Promise.resolve(null)) }));
jest.mock("@database/repositories/roleMenuRepository", () => ({ listRoleMenus: jest.fn() }));
jest.mock("@database/repositories/antiLinkRepository", () => ({
	getAntiLink: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/auditLogRepository", () => ({
	getAuditLogConfig: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/scheduledMessageRepository", () => ({
	listSchedules: jest.fn(() => Promise.resolve([])),
}));
jest.mock("@database/repositories/autoResponderRepository", () => ({
	listAutoResponders: jest.fn(() => Promise.resolve([])),
}));
jest.mock("@database/repositories/birthdayRepository", () => ({
	getBirthdaySettings: jest.fn(() => Promise.resolve(null)),
	countBirthdays: jest.fn(() => Promise.resolve(0)),
}));
jest.mock("@database/repositories/caseRepository", () => ({
	getCaseSettings: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/raidRepository", () => ({
	getRaidSettings: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/autoRoleRepository", () => ({
	getAutoRoles: jest.fn(),
}));
jest.mock("@database/repositories/countingRepository", () => ({
	getCounting: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/botStatsRepository", () => ({
	getFixedStats: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/voiceCounterRepository", () => ({
	getVoiceCounter: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/goodbyeRepository", () => ({ getGoodbyeSettings: jest.fn() }));
jest.mock("@database/repositories/welcomeRepository", () => ({
	getWelcome: jest.fn(),
}));
jest.mock("@database/repositories/stickyRepository", () => ({
	listSticky: jest.fn(() => Promise.resolve([])),
}));
jest.mock("@database/repositories/starboardRepository", () => ({ getStarboardSettings: jest.fn() }));
jest.mock("@database/repositories/tempVoiceRepository", () => ({ getTempVoiceSettings: jest.fn() }));
jest.mock("@database/repositories/verificationRepository", () => ({
	getVerifyConfig: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@lib/casino/casinoSettings.util", () => ({ readCasinoSettings: jest.fn() }));
jest.mock("@lib/economy/lotteryActions.util", () => ({ readLottery: jest.fn() }));
jest.mock("@lib/economy/treasureActions.util", () => ({
	readTreasure: jest.fn(() => Promise.resolve({ enabled: false, configured: false, minAmount: 0, maxAmount: 0 })),
}));
jest.mock("@lib/tickets/ticketActions.util", () => ({
	readTickets: jest.fn(() => Promise.resolve({ enabled: false, openTickets: 0 })),
}));

const guild = { id: "900000000000000001" } as Guild;
const allGames = { roulette: true, blackjack: true, slots: false, hilo: true, coinflip: true, dice: true };

function fresh(): void {
	jest.mocked(getWelcome).mockResolvedValue(null);
	jest.mocked(getAutoRoles).mockResolvedValue(null);
	jest.mocked(getGoodbyeSettings).mockResolvedValue(null);
	jest.mocked(listRoleMenus).mockResolvedValue([]);
	jest.mocked(getIdeaSettings).mockResolvedValue(null);
	jest.mocked(getRaidSettings).mockResolvedValue(null);
	jest.mocked(getStarboardSettings).mockResolvedValue(null);
	jest.mocked(getTempVoiceSettings).mockResolvedValue(null);
	jest.mocked(readLottery).mockResolvedValue({ enabled: false, frozen: false, ticketsSold: 0 } as never);
	jest.mocked(readCasinoSettings).mockResolvedValue({ enabled: false, games: allGames } as never);
}

const byKey = async (): Promise<Map<string, FeatureStatus>> =>
	new Map((await featuresOf(guild)).map((feature) => [feature.key, feature]));

beforeEach(fresh);

describe("featuresOf", () => {
	/** A server that has set nothing up must read as off everywhere, never as on with nothing to show. */
	it("reports a fresh server as off, with nothing to describe", async () => {
		const features = await featuresOf(guild);

		expect(features.filter((feature) => feature.enabled)).toEqual([]);
		expect(features.filter((feature) => feature.detail !== null)).toEqual([]);
	});

	it("describes what a configured feature is doing", async () => {
		jest.mocked(getWelcome).mockResolvedValue({ channelId: "400000000000000001" } as never);
		jest.mocked(getAutoRoles).mockResolvedValue({ roleIds: ["1", "2"] } as never);
		jest.mocked(listRoleMenus).mockResolvedValue([{ channelId: "400000000000000004" }] as never);
		jest.mocked(getStarboardSettings).mockResolvedValue({
			enabled: true,
			channelId: "400000000000000002",
			threshold: 5,
		} as never);
		jest
			.mocked(getTempVoiceSettings)
			.mockResolvedValue({ enabled: true, lobbyChannelId: "400000000000000003" } as never);
		jest.mocked(readCasinoSettings).mockResolvedValue({ enabled: true, games: allGames } as never);

		const features = await byKey();

		expect(features.get("welcome")).toEqual(
			expect.objectContaining({ enabled: true, detail: { kind: "posting", channelId: "400000000000000001" } }),
		);
		expect(features.get("auto-roles")?.detail).toEqual({ kind: "count", what: "roles", count: 2 });
		expect(features.get("role-menus")?.detail).toEqual({ kind: "count", what: "menus", count: 1 });
		expect(features.get("starboard")?.detail).toEqual({
			kind: "starboard",
			threshold: 5,
			channelId: "400000000000000002",
		});
		expect(features.get("temp-voice")?.detail).toEqual({ kind: "lobby", channelId: "400000000000000003" });
		expect(features.get("casino")?.detail).toEqual({ kind: "casino", open: 5, total: 6 });
	});

	/** A frozen lottery takes no tickets, so the overview must not call it running. */
	it("calls a frozen lottery off while still counting its tickets", async () => {
		jest.mocked(readLottery).mockResolvedValue({ enabled: true, frozen: true, ticketsSold: 3 } as never);

		expect((await byKey()).get("lottery")).toEqual(
			expect.objectContaining({ enabled: false, detail: { kind: "count", what: "ticketsSold", count: 3 } }),
		);
	});
});

describe("placesOf", () => {
	/** A feature with no entry in the shared table would vanish from the channel map, so the two lists must match. */
	it("knows where every feature on the overview can work", () => {
		expect(FEATURE_SOURCES.map((source) => source.key).sort()).toEqual(Object.keys(FEATURE_PLACES).sort());
	});

	it("leaves the overview's own shape alone", async () => {
		expect(Object.keys((await featuresOf(guild))[0] ?? {}).sort()).toEqual(["detail", "enabled", "key", "label"]);
	});

	it("gives a fresh server's channel features no channel, and nothing else", async () => {
		const waiting = (await placesOf(guild))
			.filter((feature) => feature.reach === "channel" && feature.places.length === 0)
			.map((feature) => feature.key);

		expect(waiting.sort()).toEqual(
			Object.entries(FEATURE_PLACES)
				.filter(([, rule]) => rule.reach === "channel")
				.map(([key]) => key)
				.sort(),
		);
	});

	/** A switched-off goodbye still belongs to its channel, so turning it back on starts where it was. */
	it("keeps the channel of a feature that is switched off", async () => {
		jest.mocked(getGoodbyeSettings).mockResolvedValue({ enabled: false, channelId: "400000000000000001" } as never);

		const goodbye = (await placesOf(guild)).find((feature) => feature.key === "goodbye");

		expect(goodbye).toEqual(
			expect.objectContaining({
				enabled: false,
				detail: null,
				places: [{ channelId: "400000000000000001", role: "posts" }],
			}),
		);
	});

	it("reads every channel a feature uses, each once", async () => {
		jest
			.mocked(listSchedules)
			.mockResolvedValue([
				{ channelId: "400000000000000001" },
				{ channelId: "400000000000000001" },
				{ channelId: "400000000000000002" },
			] as never);
		jest.mocked(readTickets).mockResolvedValue({
			enabled: true,
			openTickets: 0,
			panelChannelId: "400000000000000003",
			transcriptChannelId: "400000000000000004",
		} as never);
		jest
			.mocked(getVoiceCounter)
			.mockResolvedValue({ memberChannelId: "400000000000000005", botChannelId: null } as never);

		const places = new Map((await placesOf(guild)).map((feature) => [feature.key, feature.places]));

		expect(places.get("scheduled-messages")).toEqual([
			{ channelId: "400000000000000001", role: "posts" },
			{ channelId: "400000000000000002", role: "posts" },
		]);
		expect(places.get("tickets")).toEqual([
			{ channelId: "400000000000000003", role: "panel" },
			{ channelId: "400000000000000004", role: "logs" },
		]);
		expect(places.get("voice-stats")).toEqual([{ channelId: "400000000000000005", role: "counter" }]);
	});
});
