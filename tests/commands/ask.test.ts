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

	it("refuses markup before anything is searched or sent", async () => {
		const interaction = createMockInteraction({ options: { question: "<script>alert(1)</script>" } });

		await expect(ask.run?.(interaction, createMockClient())).rejects.toBeInstanceOf(UserFacingError);
		expect(interaction.deferReply).not.toHaveBeenCalled();
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
