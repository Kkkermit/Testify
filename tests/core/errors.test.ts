import { type APIEmbed, MessageFlags } from "discord.js";
import { type TestifyClient } from "@core/client";
import { type Command, type CommandInput } from "@core/command";
import { runButton, runCommand, UserFacingError } from "@core/errors";
import { createMockClient, createMockInteraction } from "@tests/helpers/mocks";

describe("runCommand", () => {
	const command = (run: () => Promise<void>): Command => ({ name: "demo", description: "d", category: "info", run });

	/** A user's own mistake is not a bug, so it must not reach the logs as one. */
	it("does not log a UserFacingError as a failure", async () => {
		const client = createMockClient({ logger: { error: jest.fn() } } as never);

		await runCommand(
			createMockInteraction(),
			command(() => Promise.reject(new UserFacingError("nope"))),
			client,
		);

		expect(client.logger.error).not.toHaveBeenCalled();
	});

	/** "The problem has been logged" gave somebody reporting it nothing to point at. */
	it("gives the reader a reference that finds the failure in the log", async () => {
		const interaction = createMockInteraction();
		const client = createMockClient({ logger: { error: jest.fn() } } as never);

		const outcome = await runCommand(
			interaction,
			command(() => Promise.reject(new Error("boom"))),
			client,
		);

		const reference = /\*\*([0-9A-Z]{6})\*\*/.exec(JSON.stringify(interaction.sent))?.[1];
		expect(reference).toBeDefined();
		expect(client.logger.error).toHaveBeenCalledWith(expect.objectContaining({ reference }), expect.any(String));
		// The run log keeps the same reference, which is what links a failed run to its log lines.
		expect(outcome).toEqual({ ok: false, reference });
	});

	/** A refusal is the reader's to fix and is never logged as a failure, so it has no reference to follow. */
	it("returns no reference for a failure that was not logged as a bug", async () => {
		const client = createMockClient({ logger: { error: jest.fn() } } as never);

		const outcome = await runCommand(
			createMockInteraction(),
			command(() => Promise.reject(new UserFacingError("You need 500 more coins."))),
			client,
		);

		expect(outcome).toEqual({ ok: false, reference: null });
	});

	it("answers privately when nothing has been sent yet", async () => {
		const interaction = createMockInteraction();

		await runCommand(
			interaction,
			command(() => Promise.reject(new UserFacingError("nope"))),
			createMockClient(),
		);

		expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.Ephemeral }));
	});

	/** Editing a public "thinking…" put the error in front of the whole channel. */
	it("swaps a public deferral for a private follow-up", async () => {
		const deleteReply = jest.fn(() => Promise.resolve());
		const interaction = createMockInteraction({ overrides: { deferred: true, ephemeral: false, deleteReply } });

		await runCommand(
			interaction,
			command(() => Promise.reject(new UserFacingError("nope"))),
			createMockClient(),
		);

		expect(deleteReply).toHaveBeenCalled();
		expect(interaction.editReply).not.toHaveBeenCalled();
		expect(interaction.followUp).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.Ephemeral }));
	});

	/** A button's deferred update edits the message itself, so an edit would have put the error over the board. */
	it("leaves a button's message alone and follows up privately", async () => {
		const deleteReply = jest.fn(() => Promise.resolve());
		const interaction = createMockInteraction({ overrides: { deferred: true, ephemeral: null, deleteReply } });

		await runButton(interaction as never, () => Promise.reject(new Error("boom")), createMockClient(), "board");

		expect(deleteReply).not.toHaveBeenCalled();
		expect(interaction.editReply).not.toHaveBeenCalled();
		expect(interaction.followUp).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.Ephemeral }));
	});

	it("uses a prefix command's self-clearing reply, since a message cannot be private", async () => {
		const replyBriefly = jest.fn(() => Promise.resolve());
		const interaction = createMockInteraction({ overrides: { replyBriefly } as never });

		await runCommand(
			interaction,
			command(() => Promise.reject(new UserFacingError("nope"))),
			createMockClient(),
		);

		expect(replyBriefly).toHaveBeenCalled();
		expect(interaction.reply).not.toHaveBeenCalled();
	});

	/** An expired interaction must not turn one failure into an unhandled rejection on top of it. */
	it("swallows a failure to deliver the apology", async () => {
		// Replaced after construction, since a rejecting stub cannot satisfy every overload of `reply`.
		const interaction = createMockInteraction();
		(interaction as { reply: unknown }).reply = jest.fn(() => Promise.reject(new Error("Unknown interaction")));
		const client = createMockClient({ logger: { error: jest.fn() } } as never);

		// A failure rather than a throw: the command did fail, and saying so is what lets a caller count it.
		await expect(
			runCommand(
				interaction as unknown as CommandInput,
				command(() => Promise.reject(new Error("boom"))),
				client,
			),
		).resolves.toMatchObject({ ok: false });
	});
});

describe("the error channel", () => {
	function clientWithChannel(send: jest.Mock, channelId: string | undefined): TestifyClient {
		return createMockClient({
			env: { DISCORD_OWNER_IDS: [], ...(channelId !== undefined ? { CHANNEL_ERROR_LOG: channelId } : {}) },
			logger: { error: jest.fn(), warn: jest.fn() },
			channels: {
				fetch: jest.fn(() => Promise.resolve({ isTextBased: () => true, isSendable: () => true, send })),
			},
		} as never);
	}

	const boom = (): Promise<void> => Promise.reject(new Error("boom"));
	const command = { name: "demo", description: "d", category: "info" as const, run: boom };

	it("names the button and its custom ID when a button failed", async () => {
		const send = jest.fn((_payload: unknown) => Promise.resolve({}));
		const interaction = createMockInteraction({ overrides: { customId: "shop:buy:1" } as never });

		await runButton(interaction as never, boom, clientWithChannel(send, "123"), "shop");

		const built = (send.mock.calls[0]?.[0] as { embeds: { toJSON(): APIEmbed }[] }).embeds[0]!.toJSON();
		expect(built.title).toBe("❌ Button failed · shop");
		expect(JSON.stringify(built.fields)).toContain("shop:buy:1");
	});

	it("warns rather than throwing when the channel cannot be reached", async () => {
		const send = jest.fn(() => Promise.reject(new Error("Missing Access")));
		const client = clientWithChannel(send, "123");

		await expect(
			runCommand(createMockInteraction() as unknown as CommandInput, command, client),
		).resolves.toMatchObject({ ok: false });
		expect(client.logger.warn).toHaveBeenCalled();
	});
});
