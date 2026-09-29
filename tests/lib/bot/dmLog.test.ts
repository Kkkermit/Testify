import { DiscordAPIError, MessageFlags, RESTJSONErrorCodes } from "discord.js";
import dmLog from "@buttons/dmLog";
import { parseCustomId } from "@core/button";
import { findDirectMessage } from "@database/repositories/profileRepository";
import { attachmentName, DM_LOG_ID, dmLogMessage, dmLogRow } from "@lib/bot/dmLog.util";
import { type LoggedUser } from "@lib/bot/logFields.util";
import { createMockClient, createMockUser } from "@tests/helpers/mocks";

jest.mock("@database/repositories/profileRepository", () => ({ findDirectMessage: jest.fn() }));

const OWNER = "100000000000000001";
const AUTHOR = "222222222222222222";
const LOG_MESSAGE = "555555555555555555";

const author: LoggedUser = {
	id: AUTHOR,
	username: "kermit",
	displayName: "Kermit",
	avatarUrl: "https://cdn.example/avatar.png",
	createdAt: 1_500_000_000_000,
	bot: false,
};

function labelsOf(rows: ReturnType<typeof dmLogRow>): { label: string | undefined; id: string }[] {
	return rows.flatMap((each) =>
		each.toJSON().components.map((part) => {
			const json = part as { label?: string; custom_id: string };
			return { label: json.label, id: json.custom_id };
		}),
	);
}

describe("the DM log post", () => {
	it("shows the message, who sent it and when, with User info and Reply under it", () => {
		const posted = dmLogMessage(author, { content: "Hi", sentAt: new Date(1_700_000_000_000), attachmentUrls: [] });
		const json = (
			posted.embeds![0] as { toJSON(): { title: string; description: string; fields: { name: string }[] } }
		).toJSON();

		expect(json.title).toBe("📨 Direct message received");
		expect(json.description).toBe("Hi");
		expect(json.fields.map((field) => field.name)).toEqual(["From", "Sent"]);
		expect(labelsOf(posted.components as never).map((button) => button.label)).toEqual(["User info", "Reply"]);
	});

	it("lists attachments by their own names and shows the first picture", () => {
		const posted = dmLogMessage(author, {
			content: "",
			sentAt: new Date(),
			attachmentUrls: ["https://cdn.example/a/notes.txt?ex=1", "https://cdn.example/a/cat%20photo.png?ex=2"],
		});
		const json = (
			posted.embeds![0] as {
				toJSON(): { description: string; image?: { url: string }; fields: { name: string; value: string }[] };
			}
		).toJSON();

		expect(json.description).toBe("*No text content.*");
		expect(json.fields[2]).toMatchObject({ name: "Attachments (2)" });
		expect(json.fields[2]!.value).toContain("[notes.txt]");
		expect(json.fields[2]!.value).toContain("[cat photo.png]");
		expect(json.image?.url).toBe("https://cdn.example/a/cat%20photo.png?ex=2");
		expect(attachmentName("https://cdn.example/")).toBe("attachment");
	});

	/** User info replaced the whole post, and there was no way back to the message or to Reply. */
	it("offers Back and Reply on the sender's details", () => {
		const buttons = labelsOf(dmLogRow(AUTHOR, "user"));

		expect(buttons.map((button) => button.label)).toEqual(["Back to message", "Reply"]);
		expect(buttons.map((button) => parseCustomId(button.id))).toEqual([
			{ id: DM_LOG_ID, action: "back", args: [AUTHOR] },
			{ id: DM_LOG_ID, action: "reply", args: [AUTHOR] },
		]);
	});
});

describe("the DM log's buttons", () => {
	const user = createMockUser({ id: AUTHOR, username: "kermit", send: jest.fn(() => Promise.resolve()) } as never);
	const client = createMockClient({
		isOwner: (id: string) => id === OWNER,
		users: { fetch: jest.fn(() => Promise.resolve(user)) },
	} as never);

	function pressed(presser = OWNER, modal?: string) {
		return {
			user: { id: presser },
			message: { id: LOG_MESSAGE },
			isButton: () => modal === undefined,
			isModalSubmit: () => modal !== undefined,
			fields: { getTextInputValue: () => modal ?? "" },
			update: jest.fn(() => Promise.resolve()),
			reply: jest.fn(() => Promise.resolve()),
			showModal: jest.fn(() => Promise.resolve()),
		};
	}
	const run = (interaction: ReturnType<typeof pressed>, action: string) =>
		dmLog.run(interaction as never, { client, action, args: [AUTHOR] });

	beforeEach(() => jest.clearAllMocks());

	/** The router's last-argument check refused everybody but the sender, so the owner could not press User info at all. */
	it("is not limited to whoever sent the message", () => {
		expect(dmLog.ownerOnly).not.toBe(true);
	});

	it("lets only the bot's owners use it, since Reply speaks as the bot", async () => {
		await expect(run(pressed("999999999999999999"), "info")).rejects.toThrow(/bot's owners/);
		expect(user.send).not.toHaveBeenCalled();
	});

	it("shows the sender's details with Back and Reply", async () => {
		const interaction = pressed();
		await run(interaction, "info");

		const update = (interaction.update.mock.calls[0] as unknown[])[0] as { components: ReturnType<typeof dmLogRow> };
		expect(labelsOf(update.components).map((button) => button.label)).toEqual(["Back to message", "Reply"]);
	});

	it("goes back to the message, rebuilt from the one on record", async () => {
		jest.mocked(findDirectMessage).mockResolvedValue({
			authorId: AUTHOR,
			content: "Hi",
			attachmentUrls: [],
			createdAt: new Date(1_700_000_000_000),
		});
		const interaction = pressed();
		await run(interaction, "back");

		expect(findDirectMessage).toHaveBeenCalledWith(LOG_MESSAGE);
		const update = (interaction.update.mock.calls[0] as unknown[])[0] as ReturnType<typeof dmLogMessage>;
		expect((update.embeds![0] as { toJSON(): { description: string } }).toJSON().description).toBe("Hi");
		expect(labelsOf(update.components as never).map((button) => button.label)).toEqual(["User info", "Reply"]);
	});

	it("says so when the message is no longer on record", async () => {
		jest.mocked(findDirectMessage).mockResolvedValue(null);
		await expect(run(pressed(), "back")).rejects.toThrow(/no longer have that message/);
	});

	it("opens a form, then sends the reply to the sender and confirms it privately", async () => {
		const opened = pressed();
		await run(opened, "reply");
		expect(opened.showModal).toHaveBeenCalled();

		const submitted = pressed(OWNER, "Thanks for the message!");
		await run(submitted, "send");

		expect(user.send).toHaveBeenCalledWith({ content: "Thanks for the message!", allowedMentions: { parse: [] } });
		expect(submitted.reply).toHaveBeenCalledWith(
			expect.objectContaining({
				content: expect.stringContaining("Sent to **@kermit**"),
				flags: MessageFlags.Ephemeral,
			}),
		);
	});

	it("says plainly when the sender does not accept direct messages", async () => {
		jest
			.mocked(user.send)
			.mockRejectedValueOnce(
				new DiscordAPIError(
					{ code: RESTJSONErrorCodes.CannotSendMessagesToThisUser, message: "Cannot send" },
					RESTJSONErrorCodes.CannotSendMessagesToThisUser,
					403,
					"POST",
					"/channels",
					{},
				),
			);

		await expect(run(pressed(OWNER, "Hello"), "send")).rejects.toThrow(/does not accept direct messages/);
	});
});
