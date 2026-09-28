import bugReport from "@commands/developer/bugReport.command";
import suggest from "@commands/developer/suggest.command";
import { SetupError } from "@core/errors";
import { createMockClient, createMockInteraction } from "@tests/helpers/mocks";

const BUG_CHANNEL = "700000000000000011";
const SUGGESTION_CHANNEL = "700000000000000012";

function clientWith(env: Record<string, string>, reachable = true) {
	const posted: { channelId: string; title: string }[] = [];
	const client = createMockClient({
		env: { DISCORD_OWNER_IDS: [], ...env },
		channels: {
			fetch: jest.fn((channelId: string) =>
				Promise.resolve(
					reachable
						? {
								isTextBased: () => true,
								isSendable: () => true,
								send: jest.fn((payload: { embeds: { data: { title: string } }[] }) => {
									posted.push({ channelId, title: payload.embeds[0]!.data.title });
									return Promise.resolve();
								}),
							}
						: null,
				),
			),
		},
	} as never);
	return { client, posted };
}

const both = { CHANNEL_BUG_REPORT_LOG: BUG_CHANNEL, CHANNEL_SUGGESTION_LOG: SUGGESTION_CHANNEL };

describe("/bug-report and /suggest", () => {
	/** Both passed a channel ID to Discord's webhook client, which refused it, so neither ever delivered. */
	it("each post to their own channel", async () => {
		const { client, posted } = clientWith(both);

		await bugReport.run?.(
			createMockInteraction({ options: { summary: "Deposit broke", details: "Pressed it." } }),
			client,
		);
		await suggest.run?.(createMockInteraction({ options: { suggestion: "Add a back button" } }), client);

		expect(posted).toEqual([
			{ channelId: BUG_CHANNEL, title: "Bug report" },
			{ channelId: SUGGESTION_CHANNEL, title: "Suggestion" },
		]);
	});

	it("say so when their channel has not been set", async () => {
		const { client } = clientWith({});

		await expect(
			bugReport.run?.(createMockInteraction({ options: { summary: "a", details: "b" } }), client),
		).rejects.toBeInstanceOf(SetupError);
		await expect(suggest.run?.(createMockInteraction({ options: { suggestion: "c" } }), client)).rejects.toBeInstanceOf(
			SetupError,
		);
	});

	it("say so when their channel cannot be posted in, rather than thanking somebody for nothing", async () => {
		const { client } = clientWith(both, false);
		const interaction = createMockInteraction({ options: { suggestion: "c" } });

		await expect(suggest.run?.(interaction, client)).rejects.toBeInstanceOf(SetupError);
		expect(interaction.reply).not.toHaveBeenCalled();
	});
});
