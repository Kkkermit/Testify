import { type User } from "discord.js";
import hack from "@commands/fun/subcommands/hack.command";
import { UserFacingError } from "@core/errors";
import { HACK_STAGES } from "@lib/games/hackReport.util";
import { createMockClient, createMockInteraction, createMockUser } from "@tests/helpers/mocks";

// The command waits between stages for effect; the tests have no reason to.
jest.mock("node:timers/promises", () => ({ setTimeout: jest.fn(() => Promise.resolve()) }));

function target(overrides: Parameters<typeof createMockUser>[0] = {}): User {
	return createMockUser({ id: "200000000000000001", username: "victim", ...overrides });
}

describe("/fun hack", () => {
	it("walks every stage, then shows the report", async () => {
		const interaction = createMockInteraction({ options: { user: target() } });

		await hack.run?.(interaction, createMockClient());

		expect(interaction.editReply).toHaveBeenCalledTimes(HACK_STAGES.length + 1);
		expect(interaction.editReply).toHaveBeenLastCalledWith(
			expect.objectContaining({ content: "✅ Mission complete.", embeds: [expect.anything()] }),
		);
	});

	it("shows progress on every stage", async () => {
		const interaction = createMockInteraction({ options: { user: target() } });

		await hack.run?.(interaction, createMockClient());

		const stages = jest.mocked(interaction.editReply).mock.calls.slice(0, HACK_STAGES.length);
		expect(stages.at(-1)?.[0]).toEqual({ content: expect.stringContaining("100%") as unknown });
	});

	it("refuses to hack the bot itself", async () => {
		const client = createMockClient();
		const interaction = createMockInteraction({ options: { user: target({ id: client.user?.id ?? "" }) } });

		await expect(hack.run?.(interaction, client)).rejects.toBeInstanceOf(UserFacingError);
		expect(interaction.editReply).not.toHaveBeenCalled();
	});

	it("refuses other bots", async () => {
		const interaction = createMockInteraction({ options: { user: target({ bot: true }) } });

		await expect(hack.run?.(interaction, createMockClient())).rejects.toBeInstanceOf(UserFacingError);
	});
});
