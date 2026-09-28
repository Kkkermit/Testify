import evalCommand from "@commands/owner/eval.command";
import { OWNER_ONLY_REFUSAL } from "@core/checks";
import { UserFacingError } from "@core/errors";
import { NEVER_IN_DASHBOARD } from "@lib/bot/commandRunner.util";
import { createMockClient, createMockInteraction, createMockUser, OWNER_ID } from "@tests/helpers/mocks";

function clientWith(sent: unknown[]) {
	return createMockClient({
		env: { DISCORD_OWNER_IDS: [OWNER_ID], CHANNEL_EVAL_LOG: "700000000000000021" },
		logger: { warn: jest.fn() },
		channels: {
			fetch: jest.fn(() =>
				Promise.resolve({
					isTextBased: () => true,
					isSendable: () => true,
					send: jest.fn((payload: unknown) => {
						sent.push(payload);
						return Promise.resolve();
					}),
				}),
			),
		},
	} as never);
}

describe("/eval", () => {
	it("is owner-only and never offered on the dashboard's list", () => {
		expect(evalCommand.ownerOnly).toBe(true);
		expect(NEVER_IN_DASHBOARD).toContain("eval");
	});

	/** The gate in `runChecks` is the first line; this is the second, for anything that reaches `run` without it. */
	it("refuses anybody else inside the command too, runs nothing, and records the attempt", async () => {
		const sent: unknown[] = [];
		const client = clientWith(sent);
		const interaction = createMockInteraction({ options: { code: "client.ran = true" } });

		await expect(evalCommand.run?.(interaction, client)).rejects.toEqual(new UserFacingError(OWNER_ONLY_REFUSAL));

		expect((client as unknown as { ran?: boolean }).ran).toBeUndefined();
		expect(interaction.deferReply).not.toHaveBeenCalled();
		expect(sent).toHaveLength(1);
	});

	it("runs for an owner and records the code it ran", async () => {
		const sent: unknown[] = [];
		const client = clientWith(sent);
		const interaction = createMockInteraction({
			options: { code: "1 + 1" },
			overrides: { user: createMockUser({ id: OWNER_ID, username: "owner" }) },
		});

		await evalCommand.run?.(interaction, client);

		expect(JSON.stringify(sent)).toContain("1 + 1");
		expect(client.logger.warn).toHaveBeenCalledWith(
			expect.objectContaining({ code: "1 + 1" }),
			expect.stringContaining("[EVAL]"),
		);
	});
});
