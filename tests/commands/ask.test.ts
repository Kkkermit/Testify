import { MessageFlags } from "discord.js";
import supportButton from "@buttons/support";
import ask from "@commands/info/ask.command";
import { UserFacingError } from "@core/errors";
import { type ContainerMessage } from "@lib/discord/discord.types";
import { resetSupportDesk } from "@lib/support/supportDesk.util";
import { textOf } from "@tests/helpers/containers";
import { createMockClient, createMockInteraction } from "@tests/helpers/mocks";

jest.mock("@database/repositories/settingsRepository", () => ({ getPrefix: jest.fn(() => Promise.resolve("!")) }));

beforeEach(() => resetSupportDesk());

describe("/ask", () => {
	it("answers privately with the article, using this server's prefix", async () => {
		const interaction = createMockInteraction({ options: { question: "how do prefix commands work" } });

		await ask.run?.(interaction, createMockClient());

		expect(interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
		const [sent] = interaction.sent as unknown as ContainerMessage[];
		expect(textOf(sent!)).toContain("Slash commands and prefix commands");
		expect(textOf(sent!)).toContain("`!help`");
	});

	it("opens a suggestion that was picked, rather than searching for its id", async () => {
		const interaction = createMockInteraction({ options: { question: "article:tickets" } });

		await ask.run?.(interaction, createMockClient());

		const [sent] = interaction.sent as unknown as ContainerMessage[];
		expect(textOf(sent!)).toContain("## Setting up tickets");
	});

	it("refuses markup before anything is searched or sent", async () => {
		const interaction = createMockInteraction({ options: { question: "<script>alert(1)</script>" } });

		await expect(ask.run?.(interaction, createMockClient())).rejects.toBeInstanceOf(UserFacingError);
		expect(interaction.deferReply).not.toHaveBeenCalled();
	});
});

describe("/ask's autocomplete", () => {
	interface Choice {
		name: string;
		value: string;
	}

	async function choicesFor(typed: string): Promise<Choice[]> {
		const respond = jest.fn((_choices: Choice[]) => Promise.resolve(undefined));
		await ask.autocomplete?.({ options: { getFocused: () => typed }, respond } as never, createMockClient());

		return respond.mock.calls[0]?.[0] ?? [];
	}

	it("offers the articles most people start from before anything is typed", async () => {
		const choices = await choicesFor("");

		expect(choices.map((choice) => choice.value)).toEqual(expect.arrayContaining(["article:add-the-bot"]));
		expect(choices.every((choice) => choice.name.length <= 100 && choice.value.length <= 100)).toBe(true);
	});

	/** Enter picks the first row, so it has to be what was typed, or a question would open the top suggestion instead. */
	it("puts what was typed first, then the articles it matches", async () => {
		const choices = await choicesFor("how do I set up tick");

		expect(choices[0]).toEqual({ name: "🔎 Ask: how do I set up tick", value: "how do I set up tick" });
		expect(choices.map((choice) => choice.value)).toContain("article:tickets");
	});

	it("never offers more than Discord accepts", async () => {
		expect((await choicesFor("the bot")).length).toBeLessThanOrEqual(25);
	});
});

describe("the support button", () => {
	it("opens the related article it was pressed beside", async () => {
		const update = jest.fn(() => Promise.resolve());
		const interaction = { isButton: () => true, guild: null, user: { id: "100000000000000001" }, update };

		await supportButton.run(interaction as never, { client: createMockClient(), action: "open", args: ["music"] });

		const [[screen]] = update.mock.calls as unknown as [[ContainerMessage]];
		expect(textOf(screen)).toContain("Playing music");
	});
});
