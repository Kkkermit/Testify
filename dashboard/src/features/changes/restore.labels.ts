import { type RESTORABLE, type RestorableAction } from "@testify/shared";
import { type TranslationKey } from "@/i18n";

export const RESTORE_FIELD_LABELS: {
	[Action in RestorableAction]: Record<(typeof RESTORABLE)[Action]["fields"][number], TranslationKey>;
} = {
	"welcome.update": {
		enabled: "welcome.greet",
		channelId: "welcome.sendTo",
		message: "welcome.message",
		style: "welcome.sentAs",
	},
	"goodbye.update": {
		enabled: "goodbye.say",
		channelId: "goodbye.sendTo",
		message: "goodbye.message",
		style: "welcome.sentAs",
	},
	"birthdays.update": { enabled: "birthdays.post", channelId: "birthdays.channel", message: "birthdays.message" },
	"levelling.update": {
		enabled: "levelling.earnXp",
		announce: "levelling.announce",
		stackRewards: "levelling.stack",
		levelUpChannelId: "levelling.announceIn",
	},
	"starboard.update": {
		enabled: "starboard.enabled",
		channelId: "starboard.channel",
		threshold: "starboard.threshold",
		selfStar: "starboard.selfStar",
	},
	"ideas.update": { enabled: "ideas.enabled", channelId: "ideas.channel" },
	"temp-voice.update": {
		enabled: "tempVoice.enabled",
		lobbyChannelId: "tempVoice.lobby",
		categoryId: "tempVoice.category",
		nameTemplate: "tempVoice.name",
		userLimit: "tempVoice.limit",
	},
	"raid.update": {
		enabled: "raid.enabled",
		alertChannelId: "raid.channel",
		pingRoleId: "raid.ping",
		minAccountAgeDays: "raid.minAge",
		spikeJoins: "raid.joins",
		spikeMinutes: "raid.minutes",
	},
	"cases.settings": { logChannelId: "cases.logChannel" },
	"verification.update": {
		enabled: "settings.verifyOn",
		channelId: "settings.verifyIn",
		roleId: "settings.verifyRole",
		message: "settings.verifyPanel",
	},
	"music.update": { enabled: "music.enable", djRoleIds: "music.djRoles" },
	"treasure.update": {
		enabled: "treasure.enable",
		minMessages: "treasure.fewest",
		maxMessages: "treasure.most",
		minAmount: "treasure.smallest",
		maxAmount: "treasure.largest",
		cooldownMs: "treasure.cooldown",
	},
	"lottery.update": {
		entryFee: "lottery.ticketPrice",
		basePrizePool: "lottery.startingPot",
		maxWinners: "lottery.winnersADraw",
		frequency: "lottery.draw",
		announcementChannelId: "lottery.announcements",
		frozen: "lottery.freeze",
	},
	"settings.prefix": { prefix: "settings.prefix", enabled: "settings.prefixAllow" },
	"settings.anti-link": { enabled: "settings.linkDelete", bypassPermission: "settings.linkBypass" },
	"settings.auto-roles": { roleIds: "settings.autoRoleGive" },
	"settings.counting": {
		enabled: "settings.countingRun",
		channelId: "settings.countingIn",
		maxCount: "settings.countingUpTo",
	},
	"settings.voice-stats": { memberChannelId: "settings.voiceMembers", botChannelId: "settings.voiceBots" },
};

export const RESTORE_SCREENS: Record<RestorableAction, string> = {
	"welcome.update": "/welcome",
	"goodbye.update": "/welcome",
	"birthdays.update": "/birthdays",
	"levelling.update": "/levelling",
	"starboard.update": "/starboard",
	"ideas.update": "/ideas",
	"temp-voice.update": "/temp-voice",
	"raid.update": "/raid-protection",
	"cases.settings": "/cases",
	"verification.update": "/settings",
	"music.update": "/music",
	"treasure.update": "/treasure",
	"lottery.update": "/lottery",
	"settings.prefix": "/settings",
	"settings.anti-link": "/settings",
	"settings.auto-roles": "/settings",
	"settings.counting": "/settings",
	"settings.voice-stats": "/settings",
};
