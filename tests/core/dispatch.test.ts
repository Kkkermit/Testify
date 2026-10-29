import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { type TestifyClient } from "@core/client";
import { type CommandInput, defineCommand, dispatch } from "@core/command";

const client = {} as TestifyClient;

function interactionUsing(subcommand: string | null): ChatInputCommandInteraction {
	return { options: { getSubcommand: () => subcommand } } as unknown as ChatInputCommandInteraction;
}

describe("dispatch", () => {
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
});

describe("a private command", () => {
	function recording(subcommand: string | null, tidyAway?: jest.Mock) {
		return {
			options: { getSubcommand: () => subcommand },
			deferred: false,
			reply: jest.fn(),
			deferReply: jest.fn(),
			followUp: jest.fn(),
			...(tidyAway === undefined ? {} : { tidyAway }),
		};
	}

	const answer = async (input: CommandInput): Promise<void> => {
		await input.deferReply();
		await input.reply({ content: "Your balance." });
		await input.followUp({ components: [], flags: MessageFlags.IsComponentsV2 });
	};

	/** Daily rewards and balances used to land in the channel, where a busy server drowned in them. */
	it("sends every reply only to whoever ran it", async () => {
		const input = recording(null);
		await dispatch(
			input as unknown as CommandInput,
			defineCommand({ name: "daily", description: "Daily.", category: "economy", private: true, run: answer }),
			client,
		);

		expect(input.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
		expect(input.reply).toHaveBeenCalledWith({ content: "Your balance.", flags: MessageFlags.Ephemeral });
		expect(input.followUp).toHaveBeenCalledWith({
			components: [],
			flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
		});
	});

	it("leaves the command's other subcommands public", async () => {
		const command = defineCommand({
			name: "pet",
			description: "Pets.",
			category: "economy",
			subcommands: [
				{ name: "feed", description: "Feeds.", private: true, run: answer },
				{ name: "view", description: "Shows.", run: answer },
			],
		});

		const viewed = recording("view");
		await dispatch(viewed as unknown as CommandInput, command, client);
		expect(viewed.reply).toHaveBeenCalledWith({ content: "Your balance." });

		const fed = recording("feed");
		await dispatch(fed as unknown as CommandInput, command, client);
		expect(fed.reply).toHaveBeenCalledWith({ content: "Your balance.", flags: MessageFlags.Ephemeral });
	});

	it("asks a prefix command, which cannot whisper, to tidy its replies away instead", async () => {
		const tidyAway = jest.fn();
		const input = recording(null, tidyAway);
		await dispatch(
			input as unknown as CommandInput,
			defineCommand({ name: "daily", description: "Daily.", category: "economy", private: true, run: answer }),
			client,
		);

		expect(tidyAway).toHaveBeenCalledTimes(1);
		expect(input.reply).toHaveBeenCalledWith({ content: "Your balance." });
	});
});
