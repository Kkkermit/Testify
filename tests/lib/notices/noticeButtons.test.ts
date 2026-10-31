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
	endsAt: null,
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
	jest
		.mocked(postNotice)
		.mockImplementation((input) => Promise.resolve({ ...MUSIC, ...input, endsAt: input.endsAt ?? null }));
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
			{ title: "Music is down", body: "SoundCloud still plays.", tone: "problem", endsAt: null },
			OWNER,
			expect.any(Date),
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

describe("timing on the panel", () => {
	const HOUR_MS = 60 * 60 * 1000;

	it("schedules a new one and counts how long it stays up from when it goes up", async () => {
		const before = Date.now();
		const interaction = pressed("modal", { title: "Maintenance", body: "Back soon.", start: "2h", keep: "3d" });

		await notices.run(interaction as never, context("create", true, "info"));

		const input = jest.mocked(postNotice).mock.calls[0]?.[0];
		expect(Date.parse(input?.startsAt ?? "") - before).toBeGreaterThanOrEqual(2 * HOUR_MS);
		expect(Date.parse(input?.endsAt ?? "") - Date.parse(input?.startsAt ?? "")).toBe(72 * HOUR_MS);
		expect(textOf(interaction.update.mock.calls[0]?.[0] as never)).toContain("Scheduled.");
	});

	it("refuses a length of time nobody could read, by the field's name", async () => {
		const interaction = pressed("modal", { title: "x", body: "y", start: "soonish" });

		await expect(notices.run(interaction as never, context("create", true, "info"))).rejects.toThrow(/Put it up in/);
		expect(postNotice).not.toHaveBeenCalled();
	});

	/** Blank is the way back: no end means up until removed, and no start means now. */
	it("clears the end, or posts a waiting one now, when the field is left blank", async () => {
		await notices.run(pressed("modal", { time: "" }) as never, context("end-save", true, MUSIC.id));
		await notices.run(pressed("modal", { time: "" }) as never, context("start-save", true, MUSIC.id));

		expect(changeNotice).toHaveBeenNthCalledWith(1, MUSIC.id, { endsAt: null }, expect.any(Date));
		expect(changeNotice).toHaveBeenNthCalledWith(2, MUSIC.id, { notifyAgain: true }, expect.any(Date));
	});

	it("takes one already up down after the time given, counted from now", async () => {
		const before = Date.now();

		await notices.run(pressed("modal", { time: "6h" }) as never, context("end-save", true, MUSIC.id));

		const patch = jest.mocked(changeNotice).mock.calls[0]?.[1];
		expect(Date.parse(patch?.endsAt ?? "") - before).toBeGreaterThanOrEqual(6 * HOUR_MS);
		expect(Date.parse(patch?.endsAt ?? "") - before).toBeLessThan(6 * HOUR_MS + 5_000);
	});
});
