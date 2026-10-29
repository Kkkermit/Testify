import type * as discordJs from "discord.js";
import { Collection } from "discord.js";
import { type TestifyClient } from "@core/client";
import { type Command } from "@core/command";
import { SetupError } from "@core/errors";
import { MAX_COMMANDS, publishCommands } from "@core/loader";
import { createMockClient, GUILD_ID } from "@tests/helpers/mocks";

const put = jest.fn((_route: string, _options: { body: unknown[] }) => Promise.resolve([]));

jest.mock("discord.js", () => {
	const actual = jest.requireActual<typeof discordJs>("discord.js");
	return {
		...actual,
		REST: class {
			setToken(): { put: typeof put } {
				return { put };
			}
		},
	};
});

function command(name: string): Command {
	return { name, description: `The ${name} command.`, category: "info", run: () => Promise.resolve() };
}

function clientWith(count: number, devGuildId?: string): TestifyClient {
	const commands = new Collection<string, Command>();
	for (let index = 0; index < count; index += 1) commands.set(`cmd${index}`, command(`cmd${index}`));

	return createMockClient({
		commands,
		logger: { debug: jest.fn() },
		env: {
			DISCORD_OWNER_IDS: [],
			DISCORD_TOKEN: "token",
			DISCORD_CLIENT_ID: "123456789012345678",
			...(devGuildId !== undefined ? { DISCORD_DEV_GUILD_ID: devGuildId } : {}),
		},
	} as never);
}

beforeEach(() => put.mockClear());

describe("publishCommands", () => {
	/** Guild registration keeps a half-built command off every server but the one you are testing in. */
	it("publishes to the dev guild when one is set", async () => {
		await publishCommands(clientWith(1, GUILD_ID));
		expect(String(put.mock.calls[0]?.[0])).toContain(`/guilds/${GUILD_ID}/commands`);
	});

	it("publishes right up to the limit", async () => {
		await expect(publishCommands(clientWith(MAX_COMMANDS))).resolves.toBe(MAX_COMMANDS);
	});

	/** Over the limit, publishing refuses with an explanation rather than Discord's unnamed 400. */
	it("refuses to publish over the limit, and says how to fix it", async () => {
		const failing = publishCommands(clientWith(MAX_COMMANDS + 1));

		await expect(failing).rejects.toBeInstanceOf(SetupError);
		await expect(failing).rejects.toThrow(/subcommands/);
		expect(put).not.toHaveBeenCalled();
	});
});
