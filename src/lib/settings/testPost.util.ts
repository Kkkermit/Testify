import { DiscordAPIError, type GuildMember, type MessageCreateOptions, RESTJSONErrorCodes } from "discord.js";
import { strings } from "@config/strings";
import { getWelcome } from "@database/repositories/welcomeRepository";
import { birthdayPost } from "@lib/birthdays/birthdayActions.util";
import { announcementMessage } from "@lib/moderation/announcements.util";
import { farewellFor } from "@lib/welcome/goodbyeActions.util";
import { greetingFor } from "@lib/welcome/welcomeActions.util";
import { type TestPost } from "@testify/shared";

/** "Send me a test": a draft built by the same function as the real post, sent to the person asking and nobody else. */

/** The real post for `member`, as members would get it; a direct message pings nobody, whatever the draft says. */
export async function testPostMessage(test: TestPost, member: GuildMember): Promise<MessageCreateOptions> {
	const built = await build(test, member);
	return { ...built, allowedMentions: { parse: [] } };
}

async function build(test: TestPost, member: GuildMember): Promise<MessageCreateOptions> {
	switch (test.kind) {
		case "greeting":
			// The saved background is what a card would be drawn on, whatever the draft's words.
			return greetingFor(member, { message: test.message, style: test.style }, await getWelcome(member.guild.id));
		case "goodbye":
			return farewellFor(member, { message: test.message, style: test.style });
		case "birthday":
			return birthdayPost({ id: member.id, username: member.user.username }, member.guild, test);
		case "announcement":
			return announcementMessage({
				style: test.style,
				title: test.title,
				message: test.message,
				colour: test.colour,
				mentions: "none",
				by: { name: member.displayName, avatarUrl: member.displayAvatarURL() },
			});
		case "plain":
			return { content: test.message };
	}
}

/** A note first, so the test itself arrives exactly as members will see it; `closed` when Discord will not deliver. */
export async function sendTestPost(test: TestPost, member: GuildMember): Promise<"sent" | "closed"> {
	const message = await testPostMessage(test, member);
	try {
		await member.send({
			content: strings.testPost.note(strings.testPost.what[test.kind], member.guild.name),
			allowedMentions: { parse: [] },
		});
		await member.send(message);
		return "sent";
	} catch (error) {
		if (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
			return "closed";
		}
		throw error;
	}
}
