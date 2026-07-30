import { dispatch } from "@core/command";
import { createMockClient, createMockInteraction } from "@tests/helpers/mocks";

const config = { prefix: "t?", isEnabled: true };

jest.mock("@database/repositories/settingsRepository", () => ({
	getPrefixConfig: jest.fn(() => Promise.resolve(config)),
	setPrefix: jest.fn(),
	setPrefixEnabled: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const command = require("@commands/settings/prefix.command").default as Parameters<typeof dispatch>[1];

/**
 * `/prefix` was four subcommands — `show`, `set`, `enable`, `disable` — where three
 * existed only because `set` never showed you the result. It is one panel now.
 */
describe("/prefix", () => {
	beforeEach(() => {
		config.prefix = "t?";
		config.isEnabled = true;
	});

	it("opens the panel with the current prefix", async () => {
		const interaction = createMockInteraction();
		await dispatch(interaction, command, createMockClient());

		expect(JSON.stringify(interaction.sent)).toContain("t?");
	});

	it("says text commands are on", async () => {
		const interaction = createMockInteraction();
		await dispatch(interaction, command, createMockClient());

		expect(JSON.stringify(interaction.sent)).toContain("t?help");
	});

	it("says so when text commands are off", async () => {
		config.isEnabled = false;

		const interaction = createMockInteraction();
		await dispatch(interaction, command, createMockClient());

		expect(JSON.stringify(interaction.sent)).toContain("Slash commands still work");
	});

	/** The panel is the only surface, so it must carry its own controls. */
	it("renders controls to change it", async () => {
		const interaction = createMockInteraction();
		await dispatch(interaction, command, createMockClient());

		expect(JSON.stringify(interaction.sent)).toContain("prefixsetup:");
	});
});
