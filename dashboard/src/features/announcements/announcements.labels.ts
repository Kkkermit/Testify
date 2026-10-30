import { type EmbedColour } from "@testify/shared";
import { type TranslationKey } from "@/i18n";

/** The colours by value, since the shared list names them in the English the bot's own choices use. */
export const COLOUR_LABELS: Record<EmbedColour, TranslationKey> = {
	"#00ffff": "announcements.colourAqua",
	"#7289da": "announcements.colourBlurple",
	"#0000ff": "announcements.colourBlue",
	"#ff00ff": "announcements.colourFuchsia",
	"#ffd700": "announcements.colourGold",
	"#008000": "announcements.colourGreen",
	"#808080": "announcements.colourGrey",
	"#000080": "announcements.colourNavy",
	"#ffa500": "announcements.colourOrange",
	"#ff007f": "announcements.colourPink",
	"#800080": "announcements.colourPurple",
	"#ff0000": "announcements.colourRed",
	"#ffffff": "announcements.colourWhite",
	"#ffff00": "announcements.colourYellow",
};
