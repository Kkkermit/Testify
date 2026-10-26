import {
	type Guild,
	type GuildMember,
	type GuildTextBasedChannel,
	PermissionFlagsBits,
	PermissionsBitField,
} from "discord.js";
import { UserFacingError } from "@core/errors";
import { announcementMessage, mentionProblem, sendableChannel } from "@lib/moderation/announcements.util";

const READER = { id: "100000000000000001" } as GuildMember;
const ME = { id: "100000000000000009" };
const BY = { name: "mod", avatarUrl: null };

function channelWhere(readerMay: boolean, botMay: boolean): GuildTextBasedChannel {
	return {
		permissionsFor: (who: { id: string }) =>
			new PermissionsBitField((who.id === ME.id ? botMay : readerMay) ? [PermissionFlagsBits.MentionEveryone] : []),
	} as unknown as GuildTextBasedChannel;
}

const guild = { members: { me: ME } } as unknown as Guild;

describe("mentionProblem", () => {
	it("asks nothing of an announcement that pings nobody", () => {
		expect(mentionProblem(channelWhere(false, false), guild, READER, "none")).toBeNull();
	});

	/** Manage Server is not Mention Everyone, and the bot must not ping on behalf of somebody Discord would refuse. */
	it("asks the person for Mention Everyone, then the bot", () => {
		expect(mentionProblem(channelWhere(false, true), guild, READER, "everyone")).toMatch(
			/You need the Mention Everyone/,
		);
		expect(mentionProblem(channelWhere(true, false), guild, READER, "here")).toMatch(/I need the Mention Everyone/);
		expect(mentionProblem(channelWhere(true, true), guild, READER, "everyone")).toBeNull();
		expect(mentionProblem(channelWhere(false, true), guild, undefined, "everyone")).toBeNull();
	});
});

describe("announcementMessage", () => {
	it("pings nobody unless asked, whatever the text says", () => {
		const message = announcementMessage({
			style: "text",
			message: "@everyone <@&300000000000000001> hi",
			mentions: "none",
			by: BY,
		});

		expect(message).toEqual({ content: "@everyone <@&300000000000000001> hi", allowedMentions: { parse: [] } });
	});

	it("puts the ping it was asked for first, and lets only that one through", () => {
		expect(announcementMessage({ style: "text", message: "Raid night", mentions: "here", by: BY })).toEqual({
			content: "@here\nRaid night",
			allowedMentions: { parse: ["everyone"] },
		});

		const embedded = announcementMessage({
			style: "embed",
			title: "Patch notes",
			message: "New things",
			colour: "#ff0000",
			mentions: "everyone",
			by: BY,
		});
		expect(embedded.content).toBe("@everyone");
		expect(embedded.allowedMentions).toEqual({ parse: ["everyone"] });
		expect(JSON.stringify(embedded.embeds)).toContain("Patch notes");
		expect(JSON.stringify(embedded.embeds)).toContain("Posted by mod");
	});
});

describe("sendableChannel", () => {
	it("refuses a channel the bot cannot post in", () => {
		const shut = { channels: { cache: new Map([["1", { isTextBased: () => true, isSendable: () => false }]]) } };

		expect(() => sendableChannel(shut as never, "1")).toThrow(UserFacingError);
		expect(() => sendableChannel(shut as never, "2")).toThrow(UserFacingError);
	});
});
