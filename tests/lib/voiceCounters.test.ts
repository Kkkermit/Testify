import { type Guild } from "discord.js";
import { syncVoiceCounters } from "@lib/voiceCounters.util";
import { createMockClient, createMockGuild, mockCollection } from "@tests/helpers/mocks";

jest.mock("@database/repositories/settingsRepository", () => ({
	getVoiceCounter: jest.fn(),
}));

const { getVoiceCounter } = jest.requireMock("@database/repositories/settingsRepository");

interface FakeChannel {
	name: string;
	setName: jest.Mock;
}

function guildWith(channels: Record<string, FakeChannel>, memberCount: number, bots: number): Guild {
	const members = Array.from({ length: bots }, (_unused, index) => [`bot${index}`, { user: { bot: true } }]) as [
		string,
		unknown,
	][];

	return createMockGuild({
		memberCount,
		channels: { cache: mockCollection(Object.entries(channels)) },
		members: { cache: mockCollection(members) },
	} as never);
}

const channel = (name: string): FakeChannel => ({ name, setName: jest.fn(() => Promise.resolve()) });

describe("syncVoiceCounters", () => {
	it("does nothing when the guild has not set counters up", async () => {
		getVoiceCounter.mockResolvedValue(null);
		const members = channel("Members: 0");

		await syncVoiceCounters(createMockClient(), guildWith({ m: members }, 10, 0));

		expect(members.setName).not.toHaveBeenCalled();
	});

	it("renames both channels, counting humans and bots separately", async () => {
		const members = channel("old");
		const bots = channel("old");
		getVoiceCounter.mockResolvedValue({ memberChannelId: "m", botChannelId: "b" });

		await syncVoiceCounters(createMockClient(), guildWith({ m: members, b: bots }, 100, 3));

		expect(members.setName).toHaveBeenCalledWith("Members: 97", expect.any(String));
		expect(bots.setName).toHaveBeenCalledWith("Bots: 3", expect.any(String));
	});

	it("skips a channel that is not configured", async () => {
		const members = channel("old");
		getVoiceCounter.mockResolvedValue({ memberChannelId: "m", botChannelId: null });

		await syncVoiceCounters(createMockClient(), guildWith({ m: members }, 5, 0));

		expect(members.setName).toHaveBeenCalledTimes(1);
	});

	/** A rename that changes nothing still costs one of two calls per ten minutes. */
	it("does not rename a channel that already reads correctly", async () => {
		const members = channel("Members: 5");
		getVoiceCounter.mockResolvedValue({ memberChannelId: "m", botChannelId: null });

		await syncVoiceCounters(createMockClient(), guildWith({ m: members }, 5, 0));

		expect(members.setName).not.toHaveBeenCalled();
	});

	it("ignores a configured channel that no longer exists", async () => {
		getVoiceCounter.mockResolvedValue({ memberChannelId: "gone", botChannelId: null });

		await expect(syncVoiceCounters(createMockClient(), guildWith({}, 5, 0))).resolves.toBeUndefined();
	});

	/** Discord rate-limits renames to two per ten minutes, so this happens routinely. */
	it("logs and carries on when Discord refuses the rename", async () => {
		const members = channel("old");
		members.setName.mockRejectedValue(new Error("rate limited"));
		getVoiceCounter.mockResolvedValue({ memberChannelId: "m", botChannelId: null });

		const client = createMockClient({ logger: { debug: jest.fn() } } as never);

		await expect(syncVoiceCounters(client, guildWith({ m: members }, 5, 0))).resolves.toBeUndefined();
		expect(client.logger.debug).toHaveBeenCalled();
	});

	it("never reports a negative member count", async () => {
		const members = channel("old");
		getVoiceCounter.mockResolvedValue({ memberChannelId: "m", botChannelId: null });

		await syncVoiceCounters(createMockClient(), guildWith({ m: members }, 1, 5));

		expect(members.setName).toHaveBeenCalledWith("Members: 0", expect.any(String));
	});
});
