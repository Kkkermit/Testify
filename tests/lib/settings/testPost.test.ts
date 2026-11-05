import { DiscordAPIError, type GuildMember, RESTJSONErrorCodes } from "discord.js";
import { sendTestPost, testPostMessage } from "@lib/settings/testPost.util";

jest.mock("@database/repositories/welcomeRepository", () => ({ getWelcome: jest.fn(() => Promise.resolve(null)) }));

function member(send = jest.fn((_message: unknown) => Promise.resolve({}))): GuildMember {
	return {
		id: "100000000000000002",
		displayName: "Kate",
		user: { username: "kate", displayAvatarURL: () => "https://cdn.discordapp.com/avatars/2/a.png" },
		guild: { id: "900000000000000001", name: "Test Server", memberCount: 42 },
		displayAvatarURL: () => "https://cdn.discordapp.com/avatars/2/a.png",
		send,
	} as unknown as GuildMember;
}

describe("testPostMessage", () => {
	/** The draft is filled in for the person testing it, and a direct message must ping nobody, whatever it says. */
	it("builds each kind the way the real post is built, and pings nobody", async () => {
		const greeting = await testPostMessage(
			{ kind: "greeting", message: "Hi {user} from {server}", style: "text" },
			member(),
		);
		const birthday = await testPostMessage({ kind: "birthday", message: "Happy birthday {username}!" }, member());
		const announcement = await testPostMessage(
			{ kind: "announcement", style: "text", message: "News for everybody" },
			member(),
		);

		expect([greeting.content, birthday.content, announcement.content]).toEqual([
			"Hi <@100000000000000002> from Test Server",
			"Happy birthday kate!",
			"News for everybody",
		]);
		for (const built of [greeting, birthday, announcement]) expect(built.allowedMentions).toEqual({ parse: [] });
	});
});

describe("sendTestPost", () => {
	it("answers closed, not a failure, when somebody's direct messages are shut", async () => {
		const closed = new DiscordAPIError(
			{ code: RESTJSONErrorCodes.CannotSendMessagesToThisUser, message: "Cannot send messages to this user" },
			RESTJSONErrorCodes.CannotSendMessagesToThisUser,
			403,
			"POST",
			"/channels/1/messages",
			{ body: undefined, files: undefined },
		);
		const send = jest.fn((_message: unknown): Promise<object> => Promise.reject(closed));

		expect(await sendTestPost({ kind: "plain", message: "Hi" }, member(send))).toBe("closed");
	});
});
