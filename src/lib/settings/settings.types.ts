/** The types more than one module in this domain shares. */

export interface CountingPanelState {
	channelId: string | null;
	count: number;
	goal: number;
	note?: string;
}

export interface PrefixPanelState {
	prefix: string;
	isEnabled: boolean;
	note?: string;
}

export interface VerifyConfig {
	channelId: string | null;
	roleId: string | null;
	messageId: string | null;
	message: string;
	verifiedCount: number;
}

export interface VoiceStatsPanelState {
	memberChannelId: string | null;
	botChannelId: string | null;
	note?: string;
}
