import { type ChatInputCommandInteraction } from "discord.js";
import { type TestifyClient } from "../../src/core/client";
import { defineCommand, dispatch } from "../../src/core/command";
import { UserFacingError } from "../../src/core/errors";

const client = {} as TestifyClient;

function interactionUsing(subcommand: string | null): ChatInputCommandInteraction {
	return { options: { getSubcommand: () => subcommand } } as unknown as ChatInputCommandInteraction;
}

describe("dispatch", () => {
	it("runs a plain command", async () => {
		const run = jest.fn();
		const command = defineCommand({ name: "ping", description: "Pings.", category: "info", run });

		await dispatch(interactionUsing(null), command, client);
		expect(run).toHaveBeenCalledTimes(1);
	});

	it("runs the subcommand Discord says was used", async () => {
		const set = jest.fn();
		const remove = jest.fn();
		const command = defineCommand({
			name: "welcome",
			description: "Welcome messages.",
			category: "settings",
			subcommands: [
				{ name: "set", description: "Sets it.", run: set },
				{ name: "remove", description: "Removes it.", run: remove },
			],
		});

		await dispatch(interactionUsing("remove"), command, client);

		expect(remove).toHaveBeenCalledTimes(1);
		expect(set).not.toHaveBeenCalled();
	});

	it("does not need a top-level run when there are subcommands", async () => {
		const command = defineCommand({
			name: "welcome",
			description: "Welcome messages.",
			category: "settings",
			subcommands: [{ name: "set", description: "Sets it.", run: jest.fn() }],
		});

		await expect(dispatch(interactionUsing("set"), command, client)).resolves.toBeUndefined();
	});

	it("tells the user their options when no subcommand matched", async () => {
		const command = defineCommand({
			name: "welcome",
			description: "Welcome messages.",
			category: "settings",
			subcommands: [{ name: "set", description: "Sets it.", run: jest.fn() }],
		});

		await expect(dispatch(interactionUsing(null), command, client)).rejects.toThrow(UserFacingError);
	});

	it("prefers the subcommand over a top-level run", async () => {
		const top = jest.fn();
		const sub = jest.fn();
		const command = defineCommand({
			name: "how",
			description: "Meters.",
			category: "fun",
			run: top,
			subcommands: [{ name: "gay", description: "A meter.", run: sub }],
		});

		await dispatch(interactionUsing("gay"), command, client);

		expect(sub).toHaveBeenCalledTimes(1);
		expect(top).not.toHaveBeenCalled();
	});
});
