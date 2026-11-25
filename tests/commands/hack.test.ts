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
	it("walks every stage with its progress, then shows the report", async () => {
		const interaction = createMockInteraction({ options: { user: target() } });

		await hack.run?.(interaction, createMockClient());

		const edits = jest.mocked(interaction.editReply).mock.calls;
		expect(edits).toHaveLength(HACK_STAGES.length + 1);
		expect(edits[HACK_STAGES.length - 1]?.[0]).toEqual({ content: expect.stringContaining("100%") as unknown });
		expect(edits.at(-1)?.[0]).toEqual(
			expect.objectContaining({ content: "✅ Mission complete.", embeds: [expect.anything()] }),
		);
	});

	it("refuses the bot itself and any other bot before starting", async () => {
		const client = createMockClient();
		const bots = [target({ id: client.user?.id ?? "" }), target({ bot: true })];

		for (const bot of bots) {
			const interaction = createMockInteraction({ options: { user: bot } });
			await expect(hack.run?.(interaction, client)).rejects.toBeInstanceOf(UserFacingError);
			expect(interaction.reply).not.toHaveBeenCalled();
		}
	});
});
