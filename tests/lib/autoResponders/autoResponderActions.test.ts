import {
	createAutoResponder,
	deleteAutoResponder,
	findAutoResponder,
	listAutoResponders,
	updateAutoResponder,
} from "@database/repositories/autoResponderRepository";
import {
	addAutoResponder,
	editAutoResponder,
	readAutoResponder,
	removeAutoResponder,
} from "@lib/autoResponders/autoResponderActions.util";
import { AUTO_RESPONDER_LIMITS, type AutoResponder } from "@testify/shared";

jest.mock("@database/repositories/autoResponderRepository", () => ({
	createAutoResponder: jest.fn(),
	deleteAutoResponder: jest.fn(),
	findAutoResponder: jest.fn(),
	listAutoResponders: jest.fn(),
	updateAutoResponder: jest.fn(),
}));

const GUILD = "900000000000000001";
const BY = "100000000000000001";
const existing: AutoResponder = { id: "a".repeat(24), trigger: "rules", match: "word", reply: "Read #rules." };

beforeEach(() => {
	jest.mocked(listAutoResponders).mockResolvedValue([existing]);
	jest
		.mocked(createAutoResponder)
		.mockImplementation((_guild, input) => Promise.resolve({ id: "b".repeat(24), ...input }));
});

describe("addAutoResponder", () => {
	/** The cap is what keeps a server from turning every message into a reply. */
	it("refuses one past the cap, before writing anything", async () => {
		jest
			.mocked(listAutoResponders)
			.mockResolvedValue(
				Array.from({ length: AUTO_RESPONDER_LIMITS.maxPerGuild }, (_, index) => ({ ...existing, id: String(index) })),
			);

		await expect(addAutoResponder(GUILD, { trigger: "hi", match: "word", reply: "Hello" }, BY)).rejects.toThrow(
			/can keep 25/,
		);
		expect(createAutoResponder).not.toHaveBeenCalled();
	});

	it("refuses words another responder already has, in words", async () => {
		await expect(addAutoResponder(GUILD, { trigger: "RULES", match: "exact", reply: "x" }, BY)).rejects.toThrow(
			/already an auto-responder/,
		);
		expect(createAutoResponder).not.toHaveBeenCalled();
	});

	it("refuses a reply too long to post", async () => {
		await expect(
			addAutoResponder(
				GUILD,
				{ trigger: "hi", match: "word", reply: "x".repeat(AUTO_RESPONDER_LIMITS.maxReply + 1) },
				BY,
			),
		).rejects.toThrow(/Keep the reply/);
	});
});

describe("editAutoResponder", () => {
	/** Saving a responder unchanged must not be refused as a repeat of itself. */
	it("compares against every responder but the one being edited", async () => {
		jest.mocked(updateAutoResponder).mockResolvedValue(existing);

		await expect(editAutoResponder(GUILD, existing.id, existing, BY)).resolves.toBe(existing);
	});
});

describe("reading and removing", () => {
	it("says when the one asked for has gone", async () => {
		jest.mocked(findAutoResponder).mockResolvedValue(null);
		jest.mocked(deleteAutoResponder).mockResolvedValue(false);

		await expect(readAutoResponder(GUILD, existing.id)).rejects.toThrow(/has been deleted/);
		await expect(removeAutoResponder(GUILD, existing.id)).rejects.toThrow(/has been deleted/);
	});
});
