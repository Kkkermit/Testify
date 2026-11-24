import { dispatch } from "@core/command";
import { createMockClient, createMockInteraction } from "@tests/helpers/mocks";

const config = { prefix: "t?", isEnabled: true };

jest.mock("@database/repositories/prefixRepository", () => ({
	getPrefixConfig: jest.fn(() => Promise.resolve(config)),
	setPrefix: jest.fn(),
	setPrefixEnabled: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const command = require("@commands/settings/prefix.command").default as Parameters<typeof dispatch>[1];

async function panelText(): Promise<string> {
	const interaction = createMockInteraction();
	await dispatch(interaction, command, createMockClient());
	return JSON.stringify(interaction.sent);
}

describe("/prefix", () => {
	beforeEach(() => {
		config.prefix = "t?";
		config.isEnabled = true;
	});

	/** The panel is the only surface, so it must carry its own controls as well as the prefix in use. */
	it("opens the panel with the current prefix, an example and the controls to change it", async () => {
		const text = await panelText();

		expect(text).toContain("t?help");
		expect(text).toContain("prefixsetup:");
	});

	it("says so when text commands are off", async () => {
		config.isEnabled = false;

		expect(await panelText()).toContain("Slash commands still work");
	});
});
