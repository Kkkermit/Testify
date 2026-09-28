import { MessageFlags } from "discord.js";
import { type TestifyClient } from "@core/client";
import { type Command, type CommandInput } from "@core/command";
import { runButton, runCommand, ServiceError, SetupError, toError, UserFacingError } from "@core/errors";
import { createMockClient, createMockInteraction } from "@tests/helpers/mocks";

describe("toError", () => {
	it("passes an Error straight through", () => {
		const original = new Error("nope");
		expect(toError(original)).toBe(original);
	});

	it("wraps a thrown string", () => {
		expect(toError("nope").message).toBe("nope");
	});

	it("wraps a thrown object without losing it", () => {
		expect(toError({ code: 42 }).message).toBe('{"code":42}');
	});
});

describe("the error types", () => {
	it("keeps a user-facing message as written", () => {
		expect(new UserFacingError("You need 500 more coins.").message).toBe("You need 500 more coins.");
	});

	it("names the service that failed", () => {
		const error = new ServiceError("TMDB", new Error("timeout"));
		expect(error.message).toBe("TMDB is not responding");
		expect(error.service).toBe("TMDB");
	});

	it("marks a setup problem separately, so it is not reported as a bug", () => {
		expect(new SetupError("Set CHANNEL_ERROR_LOG first.")).toBeInstanceOf(SetupError);
		expect(new SetupError("x")).not.toBeInstanceOf(UserFacingError);
	});
});

describe("runCommand", () => {
	const command = (run: () => Promise<void>): Command => ({ name: "demo", description: "d", category: "info", run });

	it("does nothing extra when the command succeeds", async () => {
		const interaction = createMockInteraction();
		await runCommand(
			interaction,
			command(() => Promise.resolve()),
			createMockClient(),
		);

		expect(interaction.sent).toEqual([]);
	});

	it("shows a UserFacingError word for word", async () => {
		const interaction = createMockInteraction();
		const client = createMockClient({ logger: { error: jest.fn() } } as never);

		await runCommand(
			interaction,
			command(() => Promise.reject(new UserFacingError("You need 500 more coins."))),
			client,
		);

		expect(JSON.stringify(interaction.sent)).toContain("You need 500 more coins.");
	});

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

	it("hides an unexpected error behind a generic apology", async () => {
		const interaction = createMockInteraction();
		const client = createMockClient({ logger: { error: jest.fn() } } as never);

		await runCommand(
			interaction,
			command(() => Promise.reject(new Error("connect ECONNREFUSED 10.0.0.1:27017"))),
			client,
		);

		const sent = JSON.stringify(interaction.sent);
		expect(sent).toContain("That did not work");
		expect(sent).toContain("running `/demo`");
		expect(sent).not.toContain("ECONNREFUSED");
	});

	/** "The problem has been logged" gave somebody reporting it nothing to point at. */
	it("gives the reader a reference that finds the failure in the log", async () => {
		const interaction = createMockInteraction();
		const client = createMockClient({ logger: { error: jest.fn() } } as never);

		await runCommand(
			interaction,
			command(() => Promise.reject(new Error("boom"))),
			client,
		);

		const reference = /\*\*([0-9A-Z]{6})\*\*/.exec(JSON.stringify(interaction.sent))?.[1];
		expect(reference).toBeDefined();
		expect(client.logger.error).toHaveBeenCalledWith(expect.objectContaining({ reference }), expect.any(String));
	});

	it("logs the unexpected error with its context", async () => {
		const client = createMockClient({ logger: { error: jest.fn() } } as never);

		await runCommand(
			createMockInteraction(),
			command(() => Promise.reject(new Error("boom"))),
			client,
		);

		expect(client.logger.error).toHaveBeenCalledWith(
			expect.objectContaining({ command: "demo" }),
			expect.stringContaining("failed"),
		);
	});

	it("tells the user which service is down, without the stack", async () => {
		const interaction = createMockInteraction();
		const client = createMockClient({ logger: { error: jest.fn() } } as never);

		await runCommand(
			interaction,
			command(() => Promise.reject(new ServiceError("TMDB", new Error("504")))),
			client,
		);

		const sent = JSON.stringify(interaction.sent);
		expect(sent).toContain("TMDB is not answering");
		expect(sent).not.toContain("504");
	});

	it("passes a SetupError through, because it says what to configure", async () => {
		const interaction = createMockInteraction();
		const client = createMockClient({ logger: { error: jest.fn() } } as never);

		await runCommand(
			interaction,
			command(() => Promise.reject(new SetupError("Set CHANNEL_ERROR_LOG first."))),
			client,
		);

		expect(JSON.stringify(interaction.sent)).toContain("Set CHANNEL_ERROR_LOG first.");
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

	it("edits a private deferral in place", async () => {
		const interaction = createMockInteraction({ overrides: { deferred: true, ephemeral: true } });

		await runCommand(
			interaction,
			command(() => Promise.reject(new UserFacingError("nope"))),
			createMockClient(),
		);

		expect(interaction.editReply).toHaveBeenCalled();
		expect(interaction.followUp).not.toHaveBeenCalled();
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

	it("follows up when the command already replied", async () => {
		const interaction = createMockInteraction({ overrides: { replied: true } });
		const client = createMockClient({ logger: { error: jest.fn() } } as never);

		await runCommand(
			interaction,
			command(() => Promise.reject(new UserFacingError("nope"))),
			client,
		);

		expect(interaction.followUp).toHaveBeenCalled();
	});

	/** An expired interaction must not turn one failure into an unhandled rejection on top of it. */
	it("swallows a failure to deliver the apology", async () => {
		// Replaced after construction, since a rejecting stub cannot satisfy every overload of `reply`.
		const interaction = createMockInteraction();
		(interaction as { reply: unknown }).reply = jest.fn(() => Promise.reject(new Error("Unknown interaction")));
		const client = createMockClient({ logger: { error: jest.fn() } } as never);

		// False rather than a throw: the command did fail, and saying so is what lets a caller count it.
		await expect(
			runCommand(
				interaction as unknown as CommandInput,
				command(() => Promise.reject(new Error("boom"))),
				client,
			),
		).resolves.toBe(false);
	});
});

describe("runButton", () => {
	it("leaves a working handler alone", async () => {
		const interaction = createMockInteraction();
		await runButton(interaction as never, () => Promise.resolve(), createMockClient(), "demo");

		expect(interaction.sent).toEqual([]);
	});

	it("reports a failing handler the same way a command failure is reported", async () => {
		const interaction = createMockInteraction();
		const client = createMockClient({ logger: { error: jest.fn() } } as never);

		await runButton(interaction as never, () => Promise.reject(new UserFacingError("Not your button.")), client, "b");

		expect(JSON.stringify(interaction.sent)).toContain("Not your button.");
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

	it("posts an unexpected failure when a channel is configured", async () => {
		const send = jest.fn(() => Promise.resolve({}));
		await runCommand(createMockInteraction(), command, clientWithChannel(send, "123"));

		expect(send).toHaveBeenCalled();
	});

	it("stays quiet when no channel is configured", async () => {
		const send = jest.fn(() => Promise.resolve({}));
		await runCommand(createMockInteraction(), command, clientWithChannel(send, undefined));

		expect(send).not.toHaveBeenCalled();
	});

	it("warns rather than throwing when the channel cannot be reached", async () => {
		const send = jest.fn(() => Promise.reject(new Error("Missing Access")));
		const client = clientWithChannel(send, "123");

		await expect(runCommand(createMockInteraction() as unknown as CommandInput, command, client)).resolves.toBe(false);
		expect(client.logger.warn).toHaveBeenCalled();
	});

	it("does not report a SetupError or a ServiceError as a bug", async () => {
		const send = jest.fn(() => Promise.resolve({}));
		const client = clientWithChannel(send, "123");

		const setup = { ...command, run: (): Promise<void> => Promise.reject(new SetupError("configure me")) };
		const service = { ...command, run: (): Promise<void> => Promise.reject(new ServiceError("TMDB", "504")) };

		await runCommand(createMockInteraction(), setup, client);
		await runCommand(createMockInteraction(), service, client);

		expect(send).not.toHaveBeenCalled();
	});
});
