import { type Guild } from "discord.js";
import { syncVoiceCounters } from "@lib/settings/voiceCounters.util";
import { createMockClient, createMockGuild, mockCollection } from "@tests/helpers/mocks";

jest.mock("@database/repositories/voiceCounterRepository", () => ({
	getVoiceCounter: jest.fn(),
}));

const { getVoiceCounter } = jest.requireMock("@database/repositories/voiceCounterRepository");

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
	/** A rename that changes nothing still costs one of two calls per ten minutes. */
	it("does not rename a channel that already reads correctly", async () => {
		const members = channel("Members: 5");
		getVoiceCounter.mockResolvedValue({ memberChannelId: "m", botChannelId: null });

		await syncVoiceCounters(createMockClient(), guildWith({ m: members }, 5, 0));

		expect(members.setName).not.toHaveBeenCalled();
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
