import { AttachmentBuilder, type Message } from "discord.js";
import type leaderboardHandler from "@buttons/leaderboard";
import { type ButtonContext, type ComponentInteraction } from "@core/button";
import { type TestifyClient } from "@core/client";
import type * as leaderboardActions from "@lib/leaderboardActions.util";

/**
 * The leaderboard image kept stacking: each press of the swap button added another
 * board beside the ones already there, until the message was a grid of four.
 *
 * Two fixes that were correct on paper did not hold, so these tests pin the
 * behaviour rather than the reasoning — the message is *edited*, the old
 * attachments are explicitly not kept, and anything that survives that is stripped.
 */
jest.mock("@lib/leaderboardActions.util", () => {
	const actual = jest.requireActual<typeof leaderboardActions>("@lib/leaderboardActions.util");

	return {
		...actual,
		boardMessage: jest.fn(() =>
			Promise.resolve({
				files: [new AttachmentBuilder(Buffer.from("png"), { name: "leaderboard.png" })],
				components: [],
			}),
		),
	};
});

const { boardMessage } = jest.requireMock<typeof leaderboardActions>("@lib/leaderboardActions.util");
const handler = jest.requireActual<{ default: typeof leaderboardHandler }>("@buttons/leaderboard").default;

const OWNER = "526853643962679323";

interface Harness {
	interaction: ComponentInteraction;
	context: ButtonContext;
	edit: jest.Mock;
	deferUpdate: jest.Mock;
}

function harness(attachmentsAfterEdit = 1): Harness {
	const edit = jest.fn();
	const deferUpdate = jest.fn(() => Promise.resolve());

	// What `message.edit()` resolves to — the message as Discord now has it.
	const edited = {
		attachments: new Map(
			Array.from({ length: attachmentsAfterEdit }, (_, index) => [`a${index}`, { id: `a${index}` }]),
		),
		edit,
	} as unknown as Message;

	edit.mockResolvedValue(edited);

	const interaction = {
		guild: { id: "1" },
		user: { id: OWNER },
		isButton: () => true,
		deferUpdate,
		message: { edit },
	} as unknown as ComponentInteraction;

	return {
		interaction,
		context: { client: {} as TestifyClient, action: "goto", args: ["levels", "0", "swap", OWNER] },
		edit,
		deferUpdate,
	};
}

describe("the leaderboard paging handler", () => {
	it("acknowledges before doing the slow work", async () => {
		const { interaction, context, deferUpdate } = harness();
		await handler.run(interaction, context);

		expect(deferUpdate).toHaveBeenCalledTimes(1);
	});

	/** The whole bug: editing the message replaces the board, replying adds one. */
	it("edits the message rather than posting another response", async () => {
		const { interaction, context, edit } = harness();
		await handler.run(interaction, context);

		expect(edit).toHaveBeenCalledTimes(1);
	});

	it("sends exactly one image and keeps none of the old ones", async () => {
		const { interaction, context, edit } = harness();
		await handler.run(interaction, context);

		const payload = edit.mock.calls[0]?.[0] as { files: unknown[]; attachments: unknown[] };

		expect(payload.files).toHaveLength(1);
		expect(payload.attachments).toEqual([]);
	});

	/** If the edit still leaves the old boards attached, they get stripped. */
	it("strips the extras when the edit leaves more than one attachment", async () => {
		const { interaction, context, edit } = harness(3);
		await handler.run(interaction, context);

		expect(edit).toHaveBeenCalledTimes(2);
		expect(edit.mock.calls[1]?.[0]).toEqual({ attachments: [{ id: "a2" }] });
	});

	it("does not make a second request when the edit behaved", async () => {
		const { interaction, context, edit } = harness(1);
		await handler.run(interaction, context);

		expect(edit).toHaveBeenCalledTimes(1);
	});

	it("renders the board named in the custom ID", async () => {
		const { interaction, context } = harness();
		await handler.run(interaction, context);

		expect(boardMessage).toHaveBeenCalledWith(interaction.guild, "levels", 0, OWNER);
	});

	it("reads the page from the custom ID", async () => {
		const { interaction, context } = harness();
		await handler.run(interaction, { ...context, args: ["economy", "4", "next", OWNER] });

		expect(boardMessage).toHaveBeenCalledWith(interaction.guild, "economy", 4, OWNER);
	});

	/** A hand-edited or stale custom ID must not crash the handler. */
	it("falls back to the first page when the page is not a number", async () => {
		const { interaction, context } = harness();
		await handler.run(interaction, { ...context, args: ["levels", "banana", "next", OWNER] });

		expect(boardMessage).toHaveBeenCalledWith(interaction.guild, "levels", 0, OWNER);
	});

	it("ignores a board it does not recognise", async () => {
		const { interaction, context, edit } = harness();
		await handler.run(interaction, { ...context, args: ["music", "0", "next", OWNER] });

		expect(edit).not.toHaveBeenCalled();
	});

	it("ignores an action that is not paging", async () => {
		const { interaction, context, edit } = harness();
		await handler.run(interaction, { ...context, action: "noop" });

		expect(edit).not.toHaveBeenCalled();
	});
});
