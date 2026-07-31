/** Every user-facing string the framework itself produces. */
export const strings = {
	generic: {
		error: "Something went wrong while running that. The incident has been logged.",
		unknownCommand: (prefix: string): string =>
			`That command does not exist. Use \`${prefix}help\` to see everything I can do.`,
		guildOnly: "This command can only be used inside a server.",
		dmOnly: "This command can only be used in direct messages.",
		underDevelopment: "This command is under development and is not available yet.",
		ownerOnly: "This command is only available to the owner of the bot.",
		blacklisted: (reason: string): string => `You are blacklisted from using this bot.\nReason: ${reason}`,
		nsfwOnly: "This command can only be used in an age-restricted channel.",
		notYourComponent: "Only the person who ran the command can use these buttons.",
		cooldown: (retryIn: string): string => `Slow down — you can use this command again in ${retryIn}.`,
		profanity: "Your message includes profanity, which is not allowed here.",
		noResults: "No results found.",
		externalApi: (service: string): string => `The ${service} service is not responding right now. Try again later.`,
	},

	permissions: {
		userMissing: (missing: string[]): string =>
			`You do not have the required permissions to use this command.\nMissing: ${missing.map((p) => `\`${p}\``).join(", ")}`,
		botMissing: (missing: string[]): string =>
			`I do not have the required permissions to do that.\nMissing: ${missing.map((p) => `\`${p}\``).join(", ")}`,
	},

	economy: {
		noAccount: "You do not have an economy account yet. Create one with `/economy create`.",
		targetNoAccount: (tag: string): string => `${tag} does not have an economy account yet.`,
		insufficientWallet: (needed: number): string => `You need **${needed.toLocaleString()}** more in your wallet.`,
		insufficientBank: (needed: number): string => `You need **${needed.toLocaleString()}** more in your bank.`,
		amountPositive: "The amount has to be a positive whole number.",
		selfTarget: "You cannot target yourself with this command.",
		botTarget: "Bots do not have economy accounts.",
	},

	ticket: {
		description: "🗳️ Ticket has been opened by",
		created: "Your ticket has been created.",
		alreadyExists: "You already have a ticket open. Close the current one before opening another.",
		noPermissions: "You do not have permission to do this.",
		error: "Something went wrong, try again later.",
		missingPerms: "I am missing the permissions needed to do this. Try giving me a higher role.",
		welcomeTitle: "Welcome, and thanks for opening a ticket. Please describe your problem in detail.",
		welcomeDescription:
			"A member of the moderation team will take care of your request shortly.\nThank you for waiting patiently.",
		closeLabel: "Close",
		closeEmoji: "📪",
		lockLabel: "Lock",
		lockEmoji: "🔒",
		unlockLabel: "Unlock",
		unlockEmoji: "🔓",
		claimLabel: "Claim",
		claimEmoji: "👋",
		manageLabel: "Members",
		manageEmoji: "➕",
		manageMenuTitle: "Choose a member.",
		manageMenuEmoji: "❔",
		closingTitle: "This ticket is being closed…",
		closingDescription: "The ticket will be closed in 5 seconds.",
		locked: "Ticket was locked successfully.",
		alreadyLocked: "This ticket is already locked.",
		unlocked: "Ticket was unlocked successfully.",
		alreadyUnlocked: "This ticket is already unlocked.",
		claimed: "Ticket was successfully claimed by",
		alreadyClaimed: "Ticket is already claimed by",
		claimedBy: ", it was claimed by",
		transcriptMember: "Member:",
		transcriptTicket: "Ticket:",
		transcriptClaimed: "Claimed:",
		transcriptModerator: "Moderator:",
		transcriptTime: "Time:",
		memberAdded: "has been added to the ticket.",
		memberRemoved: "has been removed from the ticket.",
	},

	moderation: {
		hierarchyUser: "You cannot moderate someone with a role equal to or higher than yours.",
		hierarchyBot: "I cannot moderate someone with a role equal to or higher than mine.",
		notModeratable: "I am not able to moderate that member.",
		selfTarget: "You cannot use this command on yourself.",
		botTarget: "You cannot use this command on me.",
		memberNotFound: "That member is not in this server.",
		userNotFound: "I could not find that user.",
		dmFailed: "I could not send them a direct message, but the action still went through.",
	},

	verification: {
		alreadyVerified: "You are already verified in this server.",
		wrongCode: "That code is not correct. Try again.",
		success: "You have been verified.",
	},
} as const;
