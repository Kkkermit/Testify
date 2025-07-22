module.exports = {
	// BOT VERSION //
	botVersion: "BETA-v1.6.0",

	// BOT INFO //
	prefix: "t?", // Default prefix
	status: "dnd",
	eventListeners: 20,
	botName: "testify",
	dev: "Kkermit",
	devBy: "| Developed by kkermit",
	developers: "526853643962679323",
	noPerms: `You **do not** have the required permissions to use this command!`,
	ownerOnlyCommand: `This command is **only** available for the owner of the bot!`,
	filterMessage: "Your message includes profanity which is **not** allowed!",
	botInvite: "https://discord.com/oauth2/authorize?client_id=1211784897627168778&permissions=8&scope=bot%20applications.commands",
	botServerInvite: "https://discord.gg/xcMVwAVjSD",

	noPerms: (missingPerms) => {
		const formattedPerms = missingPerms
			.map((perm) => `\`${perm.toString().split("_").join(" ").toLowerCase()}\``)
			.join(", ");
		return `You **do not** have the required permissions to use this command!\nMissing Permissions: ${formattedPerms}`;
	},

	// EMBED COLORS //
	embedColor: "Blurple",
	embedAutomod: "Blue",
	embedCommunity: "Green",
	embedModLight: "Red",
	embedModHard: "DarkRed",
	embedInfo: "LuminousVividPink",
	embedMusic: "Gold",
	embedMiniGames: "Orange",
	embedFun: "Yellow",
	embedDev: "Aqua",
	embedProfile: "Navy",
	embedAuditLogs: "Purple",
	embedLevels: "Fuchsia",
	embedEconomy: "DarkOrange",
	embedVerify: "DarkGreen",
	embedAi: "DarkGrey",
	embedSpotify: "#1DB954",
	embedInsta: "LuminousVividPink",
	embedEconomyColor: "#00FF00",

	// EMOJIS //
	automodEmoji: "<:auto:1235660206856474704>",
	modEmojiHard: "<a:mod:1235642403986083840>",
	modEmojiLight: "<a:wompus:1235671799241510973>",
	pepeCoffeeEmoji: "<:pepe:1238878395303989309>",
	arrowEmoji: "⤵",
	errorEmoji: "❌",
	auditLogEmoji: "📋",
	verifyEmoji: "<a:ver:1244732033339494450>",
	countSuccessEmoji: "<a:tick:1235674049032486945>",
	confettiEmoji: "<a:confetti:1289370096959225857>",

	// MUSIC EMOJIS //
	musicEmojiPlay: "▶️",
	musicEmojiStop: "⏹️",
	musicEmojiQueue: "📄",
	musicEmojiSuccess: "☑️",
	musicEmojiRepeat: "🔁",
	musicEmojiError: "❌",

	// CHANNEL IDS //
	botLeaveChannel: "1139731092329480332", // Logging channel for bot leaving servers
	botJoinChannel: "1240480049681928203", // Logging channel for bot joining servers
	commandErrorChannel: "1240912641719930970", // Logging channel for command errors
	evalLogsChannel: "1273733451677306880", // Logging channel for eval command
	dmLoggingChannel: "1362140847210233917", // Logging channel for DMs (when users direct message the bot)

	// Ticket Configuration //
	ticketName: "ticket-",
	ticketDescription: "🗳️ Ticket has been open by",
	ticketCreate: "✅ Your ticket has been created",
	ticketAlreadyExist: "Sorry but you already have a ticket open. If you want to open a new ticket, please close the current one.",
	ticketNoPermissions: "Sorry, but you **do not** have permission to do this.",
	ticketError: "Something went wrong, try again later.",
	ticketMessageTitle: "Welcome, thanks for opening a ticket. Please describe your problem in detail.",
	ticketMessageDescription: "A member of our moderation team will soon take care of your request.\nThank you for waiting patiently.",
	ticketMissingPerms: "Sorry, it looks like I am missing the required permissions to do this. Try giving me higher permissions.",
	ticketClose: "Close",
	ticketCloseEmoji: "📪",
	ticketLock: "Lock",
	ticketLockEmoji: "🔒",
	ticketUnlock: "Unlock",
	ticketUnlockEmoji: "🔓",
	ticketClaim: "Claim",
	ticketClaimEmoji: "👋",
	ticketManage: "Members",
	ticketManageEmoji: "➕",
	ticketManageMenuTitle: "Choose a member.",
	ticketManageMenuEmoji: "❔",
	ticketCloseTitle: "This ticket is being closed...",
	ticketCloseDescription: "Ticket will be closed in 5 seconds.",
	ticketSuccessLocked: "Ticket was locked successfully.",
	ticketAlreadyLocked: "This ticket is already locked.",
	ticketSuccessUnlocked: "Ticket was unlocked successfully.",
	ticketAlreadyUnlocked: "This ticket is already unlocked.",
	ticketSuccessClaim: "Ticket was successfully claimed by",
	ticketAlreadyClaim: "Ticket is already claimed by",
	ticketDescriptionClaim: ", it was claimed by",
	ticketTranscriptMember: "Member:",
	ticketTranscriptTicket: "Ticket:",
	ticketTranscriptClaimed: "Claimed:",
	ticketTranscriptModerator: "Moderator:",
	ticketTranscriptTime: "Time:",
	ticketMemberAdd: "has been added to the ticket.",
	ticketMemberRemove: "has been removed from the ticket.",

	// AI Chat Models //
	aiChatChannelModel: "mistral-large-latest",
	aiChatModel: "gpt-4o",
	aiImageGenModel: "flux-pro",

	// ValorantEmoji //
	valoRadianite: "<:ValoRadianite:1335281554942853271>",
	valoPoints: "<:ValoPoints:1335278703294550156>",
	valoKingdomCredits: "<:ValoKingdomCredits:1335281540107735172>",
	ultraEdition: "<:Ultra_Edition:1335281525100380313>",
	selectEdition: "<:Select_Edition:1335281506855288845>",
	premiumEdition: "<:Premium_Edition:1335281487645249567>",
	exclusiveEdition: "<:Exclusive_Edition:1335281472801869824>",
	deluxeEdition: "<:Deluxe_Edition:1335281457563701289>",
};
