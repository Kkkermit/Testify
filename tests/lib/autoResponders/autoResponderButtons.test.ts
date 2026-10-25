import { PermissionFlagsBits, PermissionsBitField } from "discord.js";
import autoResponder from "@buttons/autoResponder";
import { UserFacingError } from "@core/errors";
import {
	addAutoResponder,
	editAutoResponder,
	readAutoResponder,
	readAutoResponders,
	removeAutoResponder,
} from "@lib/autoResponders";
import { type AutoResponder } from "@testify/shared";
import { textOf } from "@tests/helpers/containers";

jest.mock("@lib/autoResponders", () => ({
	...jest.requireActual<object>("@lib/autoResponders"),
	addAutoResponder: jest.fn(),
	editAutoResponder: jest.fn(),
	readAutoResponder: jest.fn(),
	readAutoResponders: jest.fn(),
	removeAutoResponder: jest.fn(),
}));

const STAFF = new PermissionsBitField([PermissionFlagsBits.ManageGuild]);
const OWNER = "100000000000000001";
const GUILD = "900000000000000001";
const RULES: AutoResponder = { id: "a".repeat(24), trigger: "rules", match: "starts", reply: "Read #rules." };

function pressed(
	kind: "button" | "modal" | "select",
	options: { permissions?: PermissionsBitField; fields?: Record<string, string>; values?: string[] } = {},
) {
	return {
		guild: { id: GUILD },
		user: { id: OWNER },
		memberPermissions: options.permissions ?? STAFF,
		values: options.values ?? [],
		isButton: () => kind === "button",
		isModalSubmit: () => kind === "modal",
		isStringSelectMenu: () => kind === "select",
		isMessageComponent: () => kind !== "modal",
		isFromMessage: () => true,
		fields: { getTextInputValue: (id: string) => options.fields?.[id] ?? "" },
		update: jest.fn(() => Promise.resolve()),
		reply: jest.fn(() => Promise.resolve()),
		showModal: jest.fn(() => Promise.resolve()),
	};
}

const context = (action: string, ...args: string[]) => ({ client: {} as never, action, args: [...args, OWNER] });

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(readAutoResponder).mockResolvedValue(RULES);
	jest.mocked(readAutoResponders).mockResolvedValue({ responders: [RULES], limit: 25 });
	jest.mocked(editAutoResponder).mockImplementation((_guild, id, input) => Promise.resolve({ id, ...input }));
	jest
		.mocked(addAutoResponder)
		.mockImplementation((_guild, input) => Promise.resolve({ id: "b".repeat(24), ...input }));
});

describe("the auto-responder panel", () => {
	it("belongs to the person who opened it", () => {
		expect(autoResponder.ownerOnly).toBe(true);
	});

	/** A role can be taken away while the panel is open, so Manage Server is asked on every press. */
	it("refuses anybody without Manage Server, before anything changes", async () => {
		const interaction = pressed("button", { permissions: new PermissionsBitField([]) });

		await expect(autoResponder.run(interaction as never, context("delete-yes", RULES.id))).rejects.toThrow(
			UserFacingError,
		);
		expect(removeAutoResponder).not.toHaveBeenCalled();
	});

	it("adds what the form says, matched as whole words, and opens it", async () => {
		const interaction = pressed("modal", { fields: { trigger: "hi", reply: "Hello!" } });

		await autoResponder.run(interaction as never, context("create"));

		expect(addAutoResponder).toHaveBeenCalledWith(GUILD, { trigger: "hi", reply: "Hello!", match: "word" }, OWNER);
		expect(textOf(jest.mocked(interaction.update).mock.calls[0]?.[0] as never)).toContain("Added.");
	});

	it("opens the responder picked from the menu", async () => {
		const interaction = pressed("select", { values: [RULES.id] });

		await autoResponder.run(interaction as never, context("open"));

		expect(readAutoResponder).toHaveBeenCalledWith(GUILD, RULES.id);
		expect(interaction.update).toHaveBeenCalledTimes(1);
	});

	it("fills the form with the responder, and keeps how it matches when saved", async () => {
		const opening = pressed("button");
		await autoResponder.run(opening as never, context("edit", RULES.id));
		expect(JSON.stringify(opening.showModal.mock.calls[0])).toContain("Read #rules.");

		await autoResponder.run(
			pressed("modal", { fields: { trigger: "rules", reply: "See #rules." } }) as never,
			context("save", RULES.id),
		);
		expect(editAutoResponder).toHaveBeenCalledWith(
			GUILD,
			RULES.id,
			{ trigger: "rules", reply: "See #rules.", match: "starts" },
			OWNER,
		);
	});

	it("moves to the next way of matching", async () => {
		await autoResponder.run(pressed("button") as never, context("match", RULES.id));

		expect(editAutoResponder).toHaveBeenCalledWith(GUILD, RULES.id, expect.objectContaining({ match: "word" }), OWNER);
	});

	/** One press asks; only the second deletes. */
	it("asks before deleting, then deletes and goes back to the list", async () => {
		await autoResponder.run(pressed("button") as never, context("delete", RULES.id));
		expect(removeAutoResponder).not.toHaveBeenCalled();

		const confirming = pressed("button");
		await autoResponder.run(confirming as never, context("delete-yes", RULES.id));

		expect(removeAutoResponder).toHaveBeenCalledWith(GUILD, RULES.id);
		expect(textOf(jest.mocked(confirming.update).mock.calls[0]?.[0] as never)).toContain("Deleted.");
	});
});
