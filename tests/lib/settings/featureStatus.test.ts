import { type Guild } from "discord.js";
import { getAutoRoles } from "@database/repositories/autoRoleRepository";
import { getGoodbyeSettings } from "@database/repositories/goodbyeRepository";
import { getIdeaSettings } from "@database/repositories/ideaRepository";
import { countRoleMenus } from "@database/repositories/roleMenuRepository";
import { getStarboardSettings } from "@database/repositories/starboardRepository";
import { getTempVoiceSettings } from "@database/repositories/tempVoiceRepository";
import { getWelcome } from "@database/repositories/welcomeRepository";
import { readCasinoSettings } from "@lib/casino/casinoSettings.util";
import { readLottery } from "@lib/economy/lotteryActions.util";
import { countOf, FEATURE_SOURCES, featuresOf } from "@lib/settings/featureStatus.util";

jest.mock("@database/repositories/ideaRepository", () => ({ getIdeaSettings: jest.fn() }));
jest.mock("@database/repositories/levelRepository", () => ({ getLevelSettings: jest.fn(() => Promise.resolve(null)) }));
jest.mock("@database/repositories/roleMenuRepository", () => ({ countRoleMenus: jest.fn() }));
jest.mock("@database/repositories/antiLinkRepository", () => ({
	getAntiLink: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/auditLogRepository", () => ({
	getAuditLogConfig: jest.fn(() => Promise.resolve(null)),
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
	jest.mocked(countRoleMenus).mockResolvedValue(0);
	jest.mocked(getIdeaSettings).mockResolvedValue(null);
	jest.mocked(getStarboardSettings).mockResolvedValue(null);
	jest.mocked(getTempVoiceSettings).mockResolvedValue(null);
	jest.mocked(readLottery).mockResolvedValue({ enabled: false, frozen: false, ticketsSold: 0 } as never);
	jest.mocked(readCasinoSettings).mockResolvedValue({ enabled: false, games: allGames } as never);
}

const byKey = async (): Promise<Map<string, { enabled: boolean; detail: string | null }>> =>
	new Map((await featuresOf(guild)).map((feature) => [feature.key, feature]));

beforeEach(fresh);

describe("featuresOf", () => {
	it("lists every feature once, in the overview's order", async () => {
		const keys = (await featuresOf(guild)).map((feature) => feature.key);

		expect(keys).toEqual(FEATURE_SOURCES.map((source) => source.key));
		expect(new Set(keys).size).toBe(keys.length);
	});

	/** A server that has set nothing up must read as off everywhere, never as on with nothing to show. */
	it("reports a fresh server as off, with nothing to describe", async () => {
		const features = await featuresOf(guild);

		expect(features.filter((feature) => feature.enabled)).toEqual([]);
		expect(features.filter((feature) => feature.detail !== null)).toEqual([]);
	});

	it("describes what a configured feature is doing", async () => {
		jest.mocked(getWelcome).mockResolvedValue({ channelId: "400000000000000001" } as never);
		jest.mocked(getAutoRoles).mockResolvedValue({ roleIds: ["1", "2"] } as never);
		jest.mocked(countRoleMenus).mockResolvedValue(1);
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
			expect.objectContaining({ enabled: true, detail: "Posting in <#400000000000000001>" }),
		);
		expect(features.get("auto-roles")?.detail).toBe("2 roles");
		expect(features.get("role-menus")?.detail).toBe("1 menu");
		expect(features.get("starboard")?.detail).toBe("5 ⭐ to reach <#400000000000000002>");
		expect(features.get("temp-voice")?.detail).toBe("Lobby: <#400000000000000003>");
		expect(features.get("casino")?.detail).toBe("5 of 6 games open");
	});

	/** A frozen lottery takes no tickets, so the overview must not call it running. */
	it("calls a frozen lottery off while still counting its tickets", async () => {
		jest.mocked(readLottery).mockResolvedValue({ enabled: true, frozen: true, ticketsSold: 3 } as never);

		expect((await byKey()).get("lottery")).toEqual(
			expect.objectContaining({ enabled: false, detail: "3 tickets sold" }),
		);
	});

	it("names where goodbyes go only while they are switched on", async () => {
		const settings = { enabled: true, channelId: "400000000000000005", message: "Bye", style: "text" } as const;
		jest.mocked(getGoodbyeSettings).mockResolvedValue(settings);
		expect((await byKey()).get("goodbye")).toEqual(
			expect.objectContaining({ enabled: true, detail: "Posting in <#400000000000000005>" }),
		);

		jest.mocked(getGoodbyeSettings).mockResolvedValue({ ...settings, enabled: false });
		expect((await byKey()).get("goodbye")).toEqual(expect.objectContaining({ enabled: false, detail: null }));
	});

	it("says nothing about a switched-off board's channel", async () => {
		jest.mocked(getIdeaSettings).mockResolvedValue({ enabled: false, channelId: "400000000000000004" });

		expect((await byKey()).get("ideas")).toEqual(expect.objectContaining({ enabled: false, detail: null }));
	});
});

describe("countOf", () => {
	it("leaves one alone and adds an s to the rest", () => {
		expect(countOf(1, "role")).toBe("1 role");
		expect(countOf(0, "role")).toBe("0 roles");
		expect(countOf(3, "role")).toBe("3 roles");
	});

	/** The overview once read "3 ticket solds" and "2 member verifieds". */
	it("takes the plural of a phrase whose noun is not last", () => {
		expect(countOf(3, "ticket sold", "tickets sold")).toBe("3 tickets sold");
		expect(countOf(1, "ticket sold", "tickets sold")).toBe("1 ticket sold");
	});
});
