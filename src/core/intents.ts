import { GatewayIntentBits, Partials } from "discord.js";

export const intents: GatewayIntentBits[] = [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMembers,
	GatewayIntentBits.GuildModeration,
	GatewayIntentBits.GuildExpressions,
	GatewayIntentBits.GuildIntegrations,
	GatewayIntentBits.GuildWebhooks,
	GatewayIntentBits.GuildVoiceStates,
	GatewayIntentBits.GuildPresences,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.GuildMessageReactions,
	GatewayIntentBits.GuildMessageTyping,
	GatewayIntentBits.DirectMessages,
	GatewayIntentBits.DirectMessageTyping,
	GatewayIntentBits.MessageContent,
	GatewayIntentBits.GuildScheduledEvents,
	GatewayIntentBits.AutoModerationConfiguration,
	GatewayIntentBits.AutoModerationExecution,
];

export const partials: Partials[] = [
	Partials.User,
	Partials.Channel,
	Partials.GuildMember,
	Partials.Message,
	Partials.Reaction,
	Partials.ThreadMember,
	Partials.GuildScheduledEvent,
];
