import { type ChangeKind, type ChangeSource, type ChangeVerb, type ChangeWindow } from "@testify/shared";
import { type BadgeTone } from "@/components/primitives/Badge";
import { type TranslationKey } from "@/i18n";

export const KIND_LABELS: Record<ChangeKind, TranslationKey> = {
	settings: "changes.kindSettings",
	server: "changes.kindServer",
	channel: "changes.kindChannel",
	role: "changes.kindRole",
	member: "changes.kindMember",
	invite: "changes.kindInvite",
	webhook: "changes.kindWebhook",
	emoji: "changes.kindEmoji",
	sticker: "changes.kindSticker",
	message: "changes.kindMessage",
	integration: "changes.kindIntegration",
	event: "changes.kindEvent",
	thread: "changes.kindThread",
	automod: "changes.kindAutomod",
	other: "changes.kindOther",
};

export const VERB_LABELS: Record<ChangeVerb, TranslationKey> = {
	created: "changes.verbCreated",
	updated: "changes.verbUpdated",
	deleted: "changes.verbDeleted",
	kicked: "changes.verbKicked",
	banned: "changes.verbBanned",
	unbanned: "changes.verbUnbanned",
	timedOut: "changes.verbTimedOut",
	rolesChanged: "changes.verbRolesChanged",
	moved: "changes.verbMoved",
	disconnected: "changes.verbDisconnected",
	pruned: "changes.verbPruned",
	pinned: "changes.verbPinned",
	unpinned: "changes.verbUnpinned",
	botAdded: "changes.verbBotAdded",
	other: "changes.verbOther",
};

export const SOURCE_LABELS: Record<ChangeSource, TranslationKey> = {
	all: "changes.sourceAll",
	dashboard: "changes.sourceDashboard",
	discord: "changes.sourceDiscord",
};

export const WINDOW_LABELS: Record<ChangeWindow, TranslationKey> = {
	1: "changes.window1",
	3: "changes.window3",
	7: "changes.window7",
	14: "changes.window14",
};

/** Removals and moderation read loudest, so a scan down the list stops on them first. */
export function verbTone(verb: ChangeVerb): BadgeTone {
	switch (verb) {
		case "deleted":
		case "kicked":
		case "banned":
		case "pruned":
			return "danger";
		case "timedOut":
		case "disconnected":
			return "warning";
		case "created":
		case "unbanned":
		case "botAdded":
			return "success";
		case "updated":
		case "rolesChanged":
		case "moved":
		case "pinned":
		case "unpinned":
		case "other":
			return "muted";
	}
}
