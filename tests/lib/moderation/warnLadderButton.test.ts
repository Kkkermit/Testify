import warnLadder from "@buttons/warnLadder";
import { UserFacingError } from "@core/errors";
import type * as Moderation from "@lib/moderation";
import { type WarnStep } from "@testify/shared";

jest.mock("@lib/moderation", () => ({
	...jest.requireActual<typeof Moderation>("@lib/moderation"),
	readWarnLadder: jest.fn(),
	writeWarnLadder: jest.fn((_guildId: string, steps: WarnStep[]) => Promise.resolve({ steps })),
}));

const { readWarnLadder, writeWarnLadder } = jest.requireMock("@lib/moderation");

const OWNER = "100000000000000001";

function pressed(options: { values?: string[]; manager?: boolean } = {}) {
	return {
		guild: { id: "900000000000000001" },
		user: { id: OWNER },
		member: { permissions: { has: () => options.manager !== false } },
		values: options.values ?? [],
		isMessageComponent: () => true,
		isStringSelectMenu: () => options.values !== undefined,
		update: jest.fn(() => Promise.resolve()),
	};
}

const run = (interaction: ReturnType<typeof pressed>, action: string, args: string[]) =>
	warnLadder.run(interaction as never, { client: {} as never, action, args: [...args, OWNER] });

beforeEach(() => {
	jest.clearAllMocks();
	readWarnLadder.mockResolvedValue({ steps: [{ action: "warn" }, { action: "warn" }] });
});

describe("the warning punishments panel", () => {
	it("changes one step and leaves the rest", async () => {
		const interaction = pressed({ values: ["timeout-10"] });

		await run(interaction, "set", ["1"]);

		expect(writeWarnLadder).toHaveBeenCalledWith(
			"900000000000000001",
			[{ action: "warn" }, { action: "timeout", minutes: 10 }],
			OWNER,
		);
		expect(interaction.update).toHaveBeenCalledTimes(1);
	});

	it("adds a step that is only a warning until somebody picks otherwise", async () => {
		await run(pressed(), "add", []);

		expect(writeWarnLadder.mock.calls[0]?.[1]).toEqual([{ action: "warn" }, { action: "warn" }, { action: "warn" }]);
	});

	it("removes the last step", async () => {
		await run(pressed(), "pop", []);

		expect(writeWarnLadder.mock.calls[0]?.[1]).toEqual([{ action: "warn" }]);
	});

	/** Two managers with the panel open: a menu for a step the other already removed must not write past the end. */
	it("refuses a step that no longer exists", async () => {
		await expect(run(pressed({ values: ["kick"] }), "set", ["5"])).rejects.toBeInstanceOf(UserFacingError);
		expect(writeWarnLadder).not.toHaveBeenCalled();
	});

	it("refuses a value no menu offers", async () => {
		await expect(run(pressed({ values: ["timeout-7"] }), "set", ["0"])).rejects.toBeInstanceOf(UserFacingError);
	});

	/** The panel outlives the permission it was opened with. */
	it("refuses somebody who has lost Manage Server since opening it", async () => {
		await expect(run(pressed({ manager: false }), "add", [])).rejects.toThrow(/Manage Server/);
		expect(writeWarnLadder).not.toHaveBeenCalled();
	});
});
