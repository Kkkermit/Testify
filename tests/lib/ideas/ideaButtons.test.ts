import { PermissionFlagsBits, PermissionsBitField } from "discord.js";
import idea from "@buttons/idea";
import { checkOpenControl } from "@core/checks";
import { findIdea, type StoredIdea, voteOnIdea } from "@database/repositories/ideaRepository";
import { decideOnIdea } from "@lib/ideas";

jest.mock("@core/checks", () => ({
	...jest.requireActual<object>("@core/checks"),
	checkOpenControl: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/ideaRepository", () => ({
	findIdea: jest.fn(),
	voteOnIdea: jest.fn(),
}));
jest.mock("@lib/ideas", () => ({
	...jest.requireActual<object>("@lib/ideas"),
	applyIdeaSettings: jest.fn(),
	decideOnIdea: jest.fn(() => Promise.resolve({})),
	readIdeaSettings: jest.fn(),
}));

const gate = jest.mocked(checkOpenControl);
const voted = jest.mocked(voteOnIdea);
const found = jest.mocked(findIdea);
const decided = jest.mocked(decideOnIdea);

const STAFF = new PermissionsBitField([PermissionFlagsBits.ManageGuild]);
const MEMBER = new PermissionsBitField([]);
const ID = "6650a1b2c3d4e5f6a7b8c9d0";
const STORED = {
	id: ID,
	guildId: "900000000000000001",
	number: 3,
	channelId: "400000000000000001",
	messageId: "500000000000000001",
	authorId: "100000000000000002",
	authorName: "alice",
	text: "Pets",
	status: "open",
	reason: "",
	decidedBy: null,
	decidedByName: null,
	decidedAt: null,
	upVoters: ["100000000000000001"],
	downVoters: [],
	createdAt: new Date(),
} satisfies StoredIdea;

function pressed(kind: "button" | "modal", permissions = STAFF, reason = "") {
	return {
		guild: { id: STORED.guildId },
		user: { id: "100000000000000001", username: "kate" },
		memberPermissions: permissions,
		isButton: () => kind === "button",
		isModalSubmit: () => kind === "modal",
		isFromMessage: () => true,
		isMessageComponent: () => kind === "button",
		fields: { getTextInputValue: () => reason },
		update: jest.fn(() => Promise.resolve()),
		deferUpdate: jest.fn(() => Promise.resolve()),
		showModal: jest.fn(() => Promise.resolve()),
	};
}

const context = (action: string, ...args: string[]) => ({ client: {} as never, action, args });

beforeEach(() => {
	jest.clearAllMocks();
	gate.mockResolvedValue(null);
	voted.mockResolvedValue(STORED);
	found.mockResolvedValue(STORED);
});

describe("the buttons on a posted idea", () => {
	/** Anybody may press it, so the pause, the blacklist and the command's switch are what stand in the way. */
	it("refuses somebody the bot would refuse before a vote lands", async () => {
		gate.mockResolvedValue("You are blocked.");

		await expect(idea.run(pressed("button", MEMBER) as never, context("up", ID))).rejects.toThrow(/blocked/);
		expect(voted).not.toHaveBeenCalled();
		expect(gate).toHaveBeenCalledWith(expect.anything(), expect.anything(), "idea");
	});

	/** A role can be taken away while the form is open, so the submit is checked as well as the press. */
	it("checks the permission again when the form comes back", async () => {
		await expect(idea.run(pressed("modal", MEMBER, "x") as never, context("accept-save", ID))).rejects.toThrow(
			/Manage Server/,
		);
		expect(decided).not.toHaveBeenCalled();
	});
});
