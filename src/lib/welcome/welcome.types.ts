import { type WelcomeStyle } from "@database/models/guildSettings.schema";

/** The types more than one module in this domain shares. */

export interface WelcomeConfig {
	channelId: string;
	message: string;
	style: WelcomeStyle;
	hasBackground: boolean;
}
