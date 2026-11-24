export const strings = {
	generic: {
		guildOnly: "This command can only be used inside a server.",
		profanity: "Your message includes profanity, which is not allowed here.",
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
		created: "Your ticket has been created.",
		alreadyExists: "You already have a ticket open. Close the current one before opening another.",
		noPermissions: "You do not have permission to do this.",
		error: "Something went wrong, try again later.",
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
		closingTitle: "This ticket is being closed…",
		closingDescription: "The ticket will be closed in 5 seconds.",
		locked: "Ticket was locked successfully.",
		alreadyLocked: "This ticket is already locked.",
		unlocked: "Ticket was unlocked successfully.",
		alreadyUnlocked: "This ticket is already unlocked.",
		claimed: "Ticket was successfully claimed by",
		alreadyClaimed: "Ticket is already claimed by",
		transcriptMember: "Member:",
		transcriptClaimed: "Claimed:",
		transcriptModerator: "Moderator:",
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
	},

	testPost: {
		note: (what: string, server: string): string =>
			`-# A test of ${what} from the dashboard of **${server}**, sent only to you. The next message is what members will see.`,
		what: {
			greeting: "the welcome message",
			goodbye: "the goodbye message",
			birthday: "the birthday post",
			announcement: "an announcement",
			plain: "a message",
		},
		dmClosed:
			"Discord would not deliver a direct message to you. Allow direct messages from members of this server in your privacy settings, then try again.",
		notAMember: "You are not in this server, so there is no member to fill the message in for.",
	},

	verification: {
		alreadyVerified: "You are already verified in this server.",
		wrongCode: "That code is not correct. Try again.",
		success: "You have been verified.",
	},

	site: {
		/** The landing page's own sentence, which a pasted link to the website unfurls with. */
		preview: (bot: string): string =>
			`${bot} brings moderation, levels, music, tickets and a casino to Discord. Type a command, or set the same things up in your browser.`,
	},
} as const;
