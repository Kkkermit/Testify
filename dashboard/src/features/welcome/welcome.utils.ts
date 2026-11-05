import { type GoodbyeSettings, WELCOME_STYLES, type WelcomeConfigResponse, type WelcomeStyle } from "@testify/shared";
import { type TFunction } from "i18next";
import { type TranslationKey } from "@/i18n";

export const STYLE_LABELS: Record<WelcomeStyle, { label: TranslationKey; describes: TranslationKey }> = {
	text: { label: "welcome.styleText", describes: "welcome.styleTextHint" },
	embed: { label: "welcome.styleEmbed", describes: "welcome.styleEmbedHint" },
	card: { label: "welcome.styleCard", describes: "welcome.styleCardHint" },
};

export const STYLE_ORDER = WELCOME_STYLES;

/** A blurred textarea reports no caret, so the token is appended. */
export function insertToken(message: string, token: string, caret: number | null): string {
	if (caret === null || caret < 0 || caret > message.length) return `${message}${token}`;
	return `${message.slice(0, caret)}${token}${message.slice(caret)}`;
}

export interface MarkSpan {
	text: string;
	marks: Mark[];
}

type Mark = "bold" | "italic" | "underline" | "strike" | "code";

/** Longest first, so `**` is never read as two `*` and `__` never as two `_`. */
const MARKS: { open: string; mark: Mark }[] = [
	{ open: "```", mark: "code" },
	{ open: "**", mark: "bold" },
	{ open: "__", mark: "underline" },
	{ open: "~~", mark: "strike" },
	{ open: "`", mark: "code" },
	{ open: "*", mark: "italic" },
	{ open: "_", mark: "italic" },
];

/** Anything unclosed stays literal, as in Discord. */
export function markSpans(text: string): MarkSpan[] {
	const spans: MarkSpan[] = [];
	let plain = "";

	function flush(): void {
		if (plain !== "") spans.push({ text: plain, marks: [] });
		plain = "";
	}

	let at = 0;
	while (at < text.length) {
		if (text[at] === "\\" && at + 1 < text.length) {
			plain += text[at + 1];
			at += 2;
			continue;
		}

		const found = MARKS.find(({ open }) => text.startsWith(open, at));
		const close = found === undefined ? -1 : text.indexOf(found.open, at + found.open.length);

		if (found === undefined || close === -1) {
			plain += text[at];
			at += 1;
			continue;
		}

		const inner = text.slice(at + found.open.length, close);
		flush();
		for (const span of markSpans(inner)) spans.push({ text: span.text, marks: [found.mark, ...span.marks] });
		at = close + found.open.length;
	}

	flush();
	return spans;
}

type Post = Pick<WelcomeConfigResponse, "enabled" | "channelId">;

export function welcomeSummary(
	greeting: Post,
	greetingChannel: string,
	goodbye: Pick<GoodbyeSettings, "enabled" | "channelId"> | undefined,
	goodbyeChannel: string,
	t: TFunction,
): string {
	const hello =
		greeting.channelId === null
			? t("welcome.summaryNoChannel")
			: greeting.enabled
				? t("welcome.summaryOn", { channel: greetingChannel })
				: t("welcome.summaryOff");
	if (goodbye === undefined) return hello;

	const bye =
		goodbye.channelId === null
			? t("goodbye.summaryNoChannel")
			: goodbye.enabled
				? t("goodbye.summaryOn", { channel: goodbyeChannel })
				: t("goodbye.summaryOff");
	return `${hello} ${bye}`;
}
