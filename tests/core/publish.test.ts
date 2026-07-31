import type * as discordJs from "discord.js";
import { Collection } from "discord.js";
import { type TestifyClient } from "@core/client";
import { type Command } from "@core/command";
import { SetupError } from "@core/errors";
import { MAX_COMMANDS, publishCommands, publishScope } from "@core/loader";
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
	it("sends every command and reports how many", async () => {
		await expect(publishCommands(clientWith(3))).resolves.toBe(3);

		const body = put.mock.calls[0]?.[1].body;
		expect(body).toHaveLength(3);
	});

	it("publishes globally when no dev guild is set", async () => {
		await publishCommands(clientWith(1));
		expect(String(put.mock.calls[0]?.[0])).toBe("/applications/123456789012345678/commands");
	});

	/** Guild commands appear at once; global ones can take an hour to propagate. */
	it("publishes to the dev guild when one is set", async () => {
		await publishCommands(clientWith(1, GUILD_ID));
		expect(String(put.mock.calls[0]?.[0])).toContain(`/guilds/${GUILD_ID}/commands`);
	});

	it("publishes an empty set without complaint", async () => {
		await expect(publishCommands(clientWith(0))).resolves.toBe(0);
	});

	it("publishes right up to the limit", async () => {
		await expect(publishCommands(clientWith(MAX_COMMANDS))).resolves.toBe(MAX_COMMANDS);
	});

	/**
	 * Discord rejects the entire batch when it is over the limit, so failing here with an explanation beats a 400 that
	 * names no command.
	 */
	it("refuses to publish over the limit, and says how to fix it", async () => {
		const failing = publishCommands(clientWith(MAX_COMMANDS + 1));

		await expect(failing).rejects.toBeInstanceOf(SetupError);
		await expect(failing).rejects.toThrow(/subcommands/);
		expect(put).not.toHaveBeenCalled();
	});

	it("lets a transport failure surface rather than reporting a false success", async () => {
		put.mockRejectedValueOnce(new Error("401 Unauthorized"));
		await expect(publishCommands(clientWith(1))).rejects.toThrow(/401/);
	});
});

describe("publishScope", () => {
	it("says global when there is no dev guild", () => {
		expect(publishScope(clientWith(0))).toBe("every server");
	});

	it("names the guild when there is one", () => {
		expect(publishScope(clientWith(0, GUILD_ID))).toContain(GUILD_ID);
	});
});
