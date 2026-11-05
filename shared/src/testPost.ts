import { z } from "zod";
import { announcementBody } from "./announcements";
import { BIRTHDAY_LIMITS } from "./birthdays";
import { plainText } from "./text";
import { WELCOME_LIMITS, WELCOME_STYLES } from "./welcome";

/** Sent only to the person asking, as a direct message; the draft goes rather than the saved setting. */

export const TEST_POST_LIMITS = {
	/** Per person per server; a direct message is cheap to send and easy to flood somebody's inbox with. */
	perMinute: 3,
	/** Discord's own cap on a message's text. */
	maxMessage: 2_000,
} as const;

export const testPostBody = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("greeting"),
		message: plainText(1, WELCOME_LIMITS.maxMessage),
		style: z.enum(WELCOME_STYLES),
	}),
	z.object({
		kind: z.literal("goodbye"),
		message: plainText(1, WELCOME_LIMITS.maxMessage),
		style: z.enum(["text", "embed"]),
	}),
	z.object({ kind: z.literal("birthday"), message: plainText(1, BIRTHDAY_LIMITS.maxMessage) }),
	// The form's own fields, without the channel and the ping: a direct message pings nobody.
	announcementBody.pick({ style: true, title: true, message: true, colour: true }).extend({
		kind: z.literal("announcement"),
	}),
	z.object({ kind: z.literal("plain"), message: plainText(1, TEST_POST_LIMITS.maxMessage) }),
]);

export type TestPost = z.infer<typeof testPostBody>;
export type TestPostKind = TestPost["kind"];
