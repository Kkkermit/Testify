import {
	type BotStatsSettings,
	type MemberCounts,
	type StickyList,
	type TempVoiceSettings,
	type TicketSettings,
} from "@testify/shared";

/** Typed against the shared contract, so a fixture cannot drift from what the API actually returns. */

export const ticketSettings: TicketSettings = {
	enabled: true,
	panelChannelId: "400000000000000001",
	categoryId: "400000000000000005",
	transcriptChannelId: "400000000000000002",
	staffRoleId: "300000000000000003",
	description: "Press the button below and we will be with you shortly.",
	buttonLabel: "Create ticket",
	posted: true,
	openTickets: 3,
};

export const botStatsSettings: BotStatsSettings = { channelId: null };

export const memberCounts: MemberCounts = { total: 120, people: 108, bots: 12, joinedDay: 3, joinedWeek: 11 };

export const stickyList: StickyList = {
	limit: 25,
	entries: [
		{ channelId: "400000000000000001", message: "Read the rules", cap: 5, count: 3, posted: true, canSend: true },
	],
};

export const tempVoiceSettings: TempVoiceSettings = {
	enabled: true,
	lobbyChannelId: "400000000000000003",
	categoryId: null,
	nameTemplate: "{user}'s channel",
	userLimit: 0,
	canManage: true,
	active: 2,
};
