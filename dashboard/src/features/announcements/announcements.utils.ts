import {
	ANNOUNCEMENT_LIMITS,
	type AnnouncementBody,
	type AnnouncementMentions,
	type AnnouncementStyle,
	type EmbedColour,
} from "@testify/shared";
import { type TranslationKey } from "@/i18n";
import { sanitiseInput } from "@/lib/sanitise";

export interface AnnouncementDraft {
	channelId: string | null;
	style: AnnouncementStyle;
	title: string;
	message: string;
	colour: EmbedColour;
	mentions: AnnouncementMentions;
}

export const EMPTY_DRAFT: AnnouncementDraft = {
	channelId: null,
	style: "embed",
	title: "",
	message: "",
	colour: "#7289da",
	mentions: "none",
};

export const MENTION_LABELS: Record<AnnouncementMentions, { label: TranslationKey; describes: TranslationKey }> = {
	none: { label: "announcements.pingNone", describes: "announcements.pingNoneHint" },
	everyone: { label: "announcements.pingEveryone", describes: "announcements.pingEveryoneHint" },
	here: { label: "announcements.pingHere", describes: "announcements.pingHereHint" },
};

export const STYLE_LABELS: Record<AnnouncementStyle, { label: TranslationKey; describes: TranslationKey }> = {
	embed: { label: "announcements.styleEmbed", describes: "announcements.styleEmbedHint" },
	text: { label: "announcements.styleText", describes: "announcements.styleTextHint" },
};

/** What is still missing, as a key the form shows, or null when it can be posted. */
export function draftProblem(draft: AnnouncementDraft): TranslationKey | null {
	if (draft.channelId === null) return "announcements.needChannel";
	if (draft.message.trim() === "") return "announcements.needMessage";
	if (draft.message.length > ANNOUNCEMENT_LIMITS.maxMessage) return "announcements.tooLong";
	return null;
}

/** Only what the chosen style uses is sent, so a title typed and then switched away from never arrives. */
export function bodyOf(draft: AnnouncementDraft & { channelId: string }): AnnouncementBody {
	const title = sanitiseInput(draft.title).trim();
	return {
		channelId: draft.channelId,
		style: draft.style,
		message: sanitiseInput(draft.message),
		mentions: draft.mentions,
		...(draft.style === "embed" ? { colour: draft.colour, ...(title === "" ? {} : { title }) } : {}),
	};
}
