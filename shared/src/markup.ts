/**
 * Discord's own angle-bracket syntax, which an HTML sanitiser must not touch.
 *
 * `<a:name:id>` parses as an anchor tag, `<t:…>` and `</cmd:id>` as unknown tags, and every `<@id>` comes back
 * entity-encoded — so a sanitiser run over a raw message eats mentions, custom emoji and timestamps alike.
 */
const DISCORD_TOKEN_SOURCE =
	"<(?:@[!&]?\\d{17,20}|#\\d{17,20}|a?:[\\w~]{2,32}:\\d{17,20}|t:-?\\d{1,17}(?::[tTdDfFR])?|\\/[\\w -]{1,64}:\\d{17,20}|id:[a-z-]{1,32})>";

/** A fresh instance per call: a `/g` regex carries `lastIndex`, so a shared one skips every other match. */
export function discordTokens(): RegExp {
	return new RegExp(DISCORD_TOKEN_SOURCE, "g");
}

/** A `<` that an HTML parser would read as the start of a tag, rather than as literal text. */
const TAG_START = /<[a-zA-Z!/?]/;

export function withoutDiscordTokens(value: string): string {
	return value.replace(discordTokens(), "");
}

/**
 * Whether anything in the value would be parsed as HTML once Discord's own syntax is set aside.
 *
 * The API refuses rather than strips: these values are re-rendered by Discord and by the ticket transcripts,
 * and a field that silently loses half of what was typed is worse than one that says no.
 */
export function containsMarkup(value: string): boolean {
	return TAG_START.test(withoutDiscordTokens(value));
}

export const MARKUP_REFUSAL = "cannot contain HTML";
