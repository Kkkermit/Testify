import remind from "@commands/community/remind.command";
import { setReminder } from "@lib/reminders";
import { createMockInteraction } from "@tests/helpers/mocks";

jest.mock("@lib/reminders", () => ({
	...jest.requireActual<object>("@lib/reminders"),
	setReminder: jest.fn((request: { userId: string }) =>
		Promise.resolve({
			id: "6650a1b2c3d4e5f6a7b8c9d0",
			userId: request.userId,
			guildId: null,
			channelId: null,
			text: "oven",
			dueAt: new Date(),
			deliver: "dm",
			createdAt: new Date(),
		}),
	),
}));

const me = remind.subcommands?.find((subcommand) => subcommand.name === "me");

describe("/remind me", () => {
	/** The privacy notice promises a reminder's text never reaches the operator's command logs. */
	it("never lets the reminder's text into the operator's logs", () => {
		expect(me?.options?.find((option) => option.name === "about")?.unlogged).toBe(true);
	});

	it("answers only the person who set it", () => {
		expect(me?.private).toBe(true);
		expect(remind.subcommands?.find((subcommand) => subcommand.name === "list")?.private).toBe(true);
	});

	it("sets it in the channel it was run in", async () => {
		const interaction = createMockInteraction({ subcommand: "me", options: { in: "2h", about: "oven" } });

		await me?.run(interaction, {} as never);

		expect(setReminder).toHaveBeenCalledWith({
			userId: interaction.user.id,
			guildId: interaction.guildId,
			channelId: interaction.channel?.id,
			when: "2h",
			about: "oven",
		});
	});

	it("works as t?remindme too", () => {
		expect(me?.aliases).toContain("remindme");
	});
});
