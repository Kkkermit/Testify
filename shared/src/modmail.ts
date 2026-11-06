import { z } from "zod";
import { snowflake } from "./schemas";

export const MODMAIL_LIMITS = {
	/** The first message, written in a form; a relayed DM is split instead. */
	maxText: 1_800,
	/** A closed conversation is kept this long, then MongoDB lets it go. */
	keepDays: 90,
	/** Somebody with nothing open who DMs the bot is offered the servers at most this often. */
	offerEveryMinutes: 10,
	/** Discord's limit on the options in one select menu. */
	maxServersOffered: 25,
	shown: 50,
} as const;

/** A staff message starting with this stays in the thread and is never sent on. */
export const MODMAIL_NOTE_PREFIX = "//";

export interface ModmailSettings {
	enabled: boolean;
	channelId: string | null;
	/** False when the bot cannot post in the channel, make threads there or close them. */
	canUse: boolean;
	pingRoleId: string | null;
	/** Replies reach the member signed as the server's staff rather than by name. */
	anonymous: boolean;
	open: number;
}

export const modmailSettingsPatch = z
	.object({
		enabled: z.boolean().optional(),
		channelId: snowflake.nullable().optional(),
		pingRoleId: snowflake.nullable().optional(),
		anonymous: z.boolean().optional(),
	})
	.refine((patch) => Object.values(patch).some((value) => value !== undefined), "nothing to change");

export type ModmailSettingsPatch = z.infer<typeof modmailSettingsPatch>;

export interface ModmailConversation {
	id: string;
	userId: string;
	username: string;
	threadUrl: string | null;
	openedAt: string;
	lastMessageAt: string;
	/** The member wrote last, so a reply is owed. */
	waiting: boolean;
}

/** `visible` is false when the reader cannot see the mod mail channel, as Discord would hide its threads from them. */
export interface ModmailConversations {
	visible: boolean;
	items: ModmailConversation[];
}

export const modmailParams = z.object({
	conversationId: z.string().regex(/^[a-f\d]{24}$/, "must be a conversation id"),
});

/** A relayed message is split to Discord's 2,000 characters, at a line break where one is near the limit. */
export function messageChunks(text: string, size = 2_000): string[] {
	const chunks: string[] = [];
	let rest = text;

	while (rest.length > size) {
		const cut = rest.lastIndexOf("\n", size);
		const at = cut > size / 2 ? cut : size;
		chunks.push(rest.slice(0, at));
		rest = rest.slice(at).replace(/^\n/, "");
	}
	if (rest !== "" || chunks.length === 0) chunks.push(rest);

	return chunks;
}
