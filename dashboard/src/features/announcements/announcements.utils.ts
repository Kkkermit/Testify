import {
	ANNOUNCEMENT_LIMITS,
	type AnnouncementBody,
	type AnnouncementMentions,
	type AnnouncementStyle,
	type EmbedColour,
	type TestPost,
} from "@testify/shared";
import { type TFunction } from "i18next";
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

export function draftProblem(draft: AnnouncementDraft): TranslationKey | null {
	if (draft.channelId === null) return "announcements.needChannel";
	if (draft.message.trim() === "") return "announcements.needMessage";
	if (draft.message.length > ANNOUNCEMENT_LIMITS.maxMessage) return "announcements.tooLong";
	return null;
}

export function bodyOf(draft: AnnouncementDraft & { channelId: string }): AnnouncementBody {
	return { channelId: draft.channelId, mentions: draft.mentions, ...contentOf(draft) };
}

export function testOf(draft: AnnouncementDraft): Extract<TestPost, { kind: "announcement" }> {
	return { kind: "announcement", ...contentOf(draft) };
}

function contentOf(draft: AnnouncementDraft): Pick<AnnouncementBody, "style" | "title" | "message" | "colour"> {
	const title = sanitiseInput(draft.title).trim();
	return {
		style: draft.style,
		message: sanitiseInput(draft.message),
		...(draft.style === "embed" ? { colour: draft.colour, ...(title === "" ? {} : { title }) } : {}),
	};
}

export function announcementSummary(
	draft: Pick<AnnouncementDraft, "channelId" | "mentions">,
	channel: string,
	t: TFunction,
): string {
	if (draft.channelId === null) return t("announcements.summaryNoChannel");
	return draft.mentions === "none"
		? t("announcements.summaryNobody", { channel })
		: t("announcements.summaryPing", { channel, ping: `@${draft.mentions}` });
}
