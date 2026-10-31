import notices from "@buttons/notices";
import { UserFacingError } from "@core/errors";
import { allNotices, changeNotice, postNotice, readNotice, removeNotice } from "@lib/notices";
import { type Notice } from "@testify/shared";
import { textOf } from "@tests/helpers/containers";

jest.mock("@lib/notices", () => ({
	...jest.requireActual<object>("@lib/notices"),
	allNotices: jest.fn(),
	changeNotice: jest.fn(),
	postNotice: jest.fn(),
	readNotice: jest.fn(),
	removeNotice: jest.fn(),
}));

const OWNER = "100000000000000001";
const MUSIC: Notice = {
	id: "a".repeat(24),
	title: "Music is down",
	body: "YouTube is refusing the bot.",
	tone: "problem",
	publishedAt: "2026-10-31T10:00:00.000Z",
	updatedAt: "2026-10-31T10:00:00.000Z",
};

function pressed(kind: "button" | "modal" | "select", fields: Record<string, string> = {}, values: string[] = []) {
	return {
		user: { id: OWNER },
		values,
		isButton: () => kind === "button",
		isModalSubmit: () => kind === "modal",
		isStringSelectMenu: () => kind === "select",
		isMessageComponent: () => kind !== "modal",
		isFromMessage: () => true,
		fields: { getTextInputValue: (id: string) => fields[id] ?? "" },
		update: jest.fn((_panel: unknown) => Promise.resolve()),
		showModal: jest.fn(() => Promise.resolve()),
	};
}

function context(action: string, owner: boolean, ...args: string[]) {
	return { client: { isOwner: () => owner } as never, action, args: [...args, OWNER] };
}

beforeEach(() => {
	jest.mocked(allNotices).mockResolvedValue([MUSIC]);
	jest.mocked(readNotice).mockResolvedValue(MUSIC);
	jest.mocked(changeNotice).mockResolvedValue(MUSIC);
	jest.mocked(postNotice).mockImplementation((input) => Promise.resolve({ ...MUSIC, ...input }));
	jest.mocked(removeNotice).mockResolvedValue();
});

describe("the notifications panel's controls", () => {
	/** Ownership is read from the env on every press, so somebody taken off the list loses the controls at once. */
	it("refuses anybody who is not one of the bot's owners, before anything changes", async () => {
		for (const action of ["create", "save", "again", "remove-yes"]) {
			const interaction = pressed(action === "create" || action === "save" ? "modal" : "button", {
				title: "x",
				body: "y",
			});
			await expect(notices.run(interaction as never, context(action, false, MUSIC.id))).rejects.toThrow(
				UserFacingError,
			);
		}

		expect(postNotice).not.toHaveBeenCalled();
		expect(changeNotice).not.toHaveBeenCalled();
		expect(removeNotice).not.toHaveBeenCalled();
	});

	it("posts what the form says, with the kind the button chose", async () => {
		const interaction = pressed("modal", { title: "Music is down", body: "SoundCloud still plays." });

		await notices.run(interaction as never, context("create", true, "problem"));

		expect(postNotice).toHaveBeenCalledWith(
			{ title: "Music is down", body: "SoundCloud still plays.", tone: "problem" },
			OWNER,
		);
		expect(textOf(interaction.update.mock.calls[0]?.[0] as never)).toContain("Posted.");
	});

	it("tells everybody again only when asked to", async () => {
		await notices.run(pressed("button") as never, context("again", true, MUSIC.id));

		expect(changeNotice).toHaveBeenCalledWith(MUSIC.id, { notifyAgain: true });
	});

	/** One press asks; only the second removes. */
	it("asks before removing, then removes and goes back to the list", async () => {
		await notices.run(pressed("button") as never, context("remove", true, MUSIC.id));
		expect(removeNotice).not.toHaveBeenCalled();

		await notices.run(pressed("button") as never, context("remove-yes", true, MUSIC.id));
		expect(removeNotice).toHaveBeenCalledWith(MUSIC.id);
	});
});
