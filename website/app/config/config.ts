import { fetchGitHubVersion } from "../utils/github-api";
import botConfig from "../config/config.json" assert { type: "json" };

interface BotConfig {
	name: string;
	description: string;
	tag: string;
	clientId: string;
	version: string;
	urls: {
		invite: string;
		support: string;
		github: string;
		website: string;
	};
	social: {
		discord: string;
		twitter?: string;
		github?: string;
	};
	stats: {
		commands: number;
	};
}

let botInfo = {
	name: "Testify",
	tag: "Testify#0000",
	commandCount: 0,
	version: "1.0.0",
	clientId: "",
};

try {
	const [botResponse, version] = await Promise.all([fetch("http://localhost:3001/api/bot"), fetchGitHubVersion()]);

	const botData = await botResponse.json();
	botInfo = {
		...botData,
		version,
	};
} catch (error) {
	console.error("Failed to fetch bot info:", error);
}

const generateInviteUrl = (clientId: string) =>
	`https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=applications.commands+bot`;

const config: BotConfig = {
	name: botInfo.name,
	description: "A powerful Discord bot with moderation and fun features",
	tag: botInfo.tag,
	clientId: botInfo.clientId,
	version: botInfo.version,
	urls: {
		invite: generateInviteUrl(botInfo.clientId),
		support: botConfig.botSupportServer,
		github: botConfig.botGithubRepo,
		website: botConfig.websiteUrl,
	},
	social: {
		discord: botConfig.ownerDiscordProfile,
		github: botConfig.ownerGithubProfile,
	},
	stats: {
		commands: botInfo.commandCount,
	},
};

export default config;
