import { type WelcomeStyle } from "@database/models/welcome.schema";

export interface WelcomeConfig {
	channelId: string;
	message: string;
	style: WelcomeStyle;
	hasBackground: boolean;
}
