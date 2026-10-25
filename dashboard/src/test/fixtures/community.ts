import {
	type BoardPage,
	type IdeaRow,
	type IdeaSettings,
	type LevelConfigResponse,
	type Paged,
	type RoleMenuList,
	type StarboardSettings,
	type WelcomeConfigResponse,
} from "@testify/shared";

/** Typed against the shared contract, so a fixture cannot drift from what the API actually returns. */

export const levelConfig: LevelConfigResponse = {
	enabled: true,
	boosts: [{ roleId: "300000000000000002", multiplier: 2 }],
	rewards: [{ level: 5, roleId: "300000000000000001" }],
	stackRewards: true,
	levelUpChannelId: null,
	announce: true,
	ignoredChannelIds: [],
	ignoredRoleIds: [],
};

export const welcomeConfig: WelcomeConfigResponse = {
	enabled: true,
	channelId: "400000000000000001",
	message: "Welcome to **{server}**, {user}! You are member **{count}**.",
	style: "card",
	hasBackground: false,
};

export const economyBoard: BoardPage = {
	board: "economy",
	sort: "total",
	scope: "server",
	page: 1,
	pages: 2,
	total: 30,
	rows: [
		{
			userId: "100000000000000001",
			rank: 1,
			displayName: "someone",
			avatarUrl: null,
			primary: 9_400,
			secondary: 6_000,
			inGuild: true,
		},
		{
			userId: "100000000000000002",
			rank: 2,
			displayName: "kate",
			avatarUrl: null,
			primary: 5_120,
			secondary: 120,
			inGuild: true,
		},
		{
			userId: "100000000000000003",
			rank: 3,
			displayName: "Left the server",
			avatarUrl: null,
			primary: 800,
			secondary: 0,
			inGuild: false,
		},
	],
	you: { rank: 1, page: 1 },
};

export const roleMenuList: RoleMenuList = {
	limit: 10,
	menus: [
		{
			id: "6650a1b2c3d4e5f6a7b8c9d0",
			channelId: "400000000000000001",
			title: "Pick your pings",
			description: "Choose what you hear about.",
			roleIds: ["300000000000000001", "300000000000000002"],
			mode: "many",
			posted: true,
			canSend: true,
		},
	],
};

export const ideaSettings: IdeaSettings = {
	enabled: true,
	channelId: "400000000000000001",
	canSend: true,
	counts: { open: 1, accepted: 1, declined: 0 },
};

export const starboardSettings: StarboardSettings = {
	enabled: true,
	channelId: "400000000000000001",
	threshold: 3,
	selfStar: false,
	canSend: true,
	posts: 4,
};

export const ideaPage: Paged<IdeaRow> = {
	page: 1,
	perPage: 10,
	total: 2,
	items: [
		{
			id: "6650a1b2c3d4e5f6a7b8c9d1",
			number: 2,
			authorId: "100000000000000002",
			authorName: "alice",
			text: "A channel for pets.",
			status: "open",
			reason: "",
			decidedByName: null,
			decidedAt: null,
			up: 5,
			down: 1,
			createdAt: "2026-10-20T10:00:00.000Z",
			messageUrl: "https://discord.com/channels/900000000000000001/400000000000000001/500000000000000002",
		},
		{
			id: "6650a1b2c3d4e5f6a7b8c9d2",
			number: 1,
			authorId: "100000000000000003",
			authorName: "bob",
			text: "Weekly movie night.",
			status: "accepted",
			reason: "Starting Friday.",
			decidedByName: "kate",
			decidedAt: "2026-10-21T10:00:00.000Z",
			up: 9,
			down: 0,
			createdAt: "2026-10-19T10:00:00.000Z",
			messageUrl: null,
		},
	],
};
