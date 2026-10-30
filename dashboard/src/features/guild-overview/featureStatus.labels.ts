import { type FeatureCount, type FeatureDetail, type WatchedPermission } from "@testify/shared";
import { type TFunction } from "i18next";
import { permissionLabel } from "@/features/commands/permissions.labels";
import { type TranslationKey } from "@/i18n";
import { formatNumber } from "@/lib/intl";

/** Each feature by the name its own screen goes by, so the overview and the sidebar never disagree. */
const FEATURE_LABELS: Record<string, TranslationKey> = {
	levelling: "levelling.title",
	"audit-logging": "auditLog.title",
	welcome: "welcome.title",
	goodbye: "goodbye.heading",
	birthdays: "birthdays.title",
	verification: "settings.verifyTitle",
	cases: "cases.title",
	"raid-protection": "raid.title",
	"anti-link": "settings.linkTitle",
	counting: "settings.countingTitle",
	"auto-roles": "settings.autoRoleTitle",
	"role-menus": "roleMenus.title",
	ideas: "ideas.title",
	starboard: "starboard.title",
	"temp-voice": "tempVoice.title",
	"voice-stats": "settings.voiceTitle",
	sticky: "sticky.title",
	"auto-responders": "autoResponders.title",
	"scheduled-messages": "scheduled.title",
	treasure: "treasure.title",
	tickets: "tickets.title",
	lottery: "lottery.title",
	casino: "casino.title",
	"bot-stats": "botStats.title",
};

const COUNT_LABELS: Record<FeatureCount, TranslationKey> = {
	events: "overview.countEvents",
	birthdays: "overview.countBirthdays",
	verified: "overview.countVerified",
	roles: "overview.countRoles",
	menus: "overview.countMenus",
	channels: "overview.countChannels",
	responders: "overview.countResponders",
	messages: "overview.countMessages",
	ticketsOpen: "overview.countTicketsOpen",
	ticketsSold: "overview.countTicketsSold",
};

export const MISSING_LABELS: Record<WatchedPermission, TranslationKey> = {
	ManageRoles: "overview.missingManageRoles",
	ManageMessages: "overview.missingManageMessages",
	ViewAuditLog: "overview.missingViewAuditLog",
	ManageChannels: "overview.missingManageChannels",
	AttachFiles: "overview.missingAttachFiles",
};

/** A feature the dashboard has not been told about yet keeps the name the bot gave it. */
export function featureLabel(key: string, fallback: string, t: TFunction): string {
	const label = FEATURE_LABELS[key];
	return label === undefined ? fallback : t(label);
}

/** One line about a feature, with each channel named as `channel` names it for this reader. */
export function describeDetail(detail: FeatureDetail, t: TFunction, channel: (id: string) => string): string {
	switch (detail.kind) {
		case "posting":
			return t("overview.detailPosting", { channel: channel(detail.channelId) });
		case "count":
			return t(COUNT_LABELS[detail.what], { count: detail.count });
		case "levelling":
			return `${t("overview.countRewards", { count: detail.rewards })}, ${t("overview.countBoosts", { count: detail.boosts })}`;
		case "holding":
			return t("overview.detailHolding", { count: detail.days });
		case "watching":
			return t("overview.detailWatching");
		case "bypass":
			return t("overview.detailBypass", { permission: permissionLabel(detail.permission, t) });
		case "countingAt":
			return t("overview.detailCountingAt", { at: detail.count });
		case "starboard":
			return t("overview.detailStarboard", { threshold: detail.threshold, channel: channel(detail.channelId) });
		case "lobby":
			return t("overview.detailLobby", { channel: channel(detail.channelId) });
		case "treasure":
			return t("overview.detailTreasure", {
				amount:
					detail.min === detail.max
						? formatNumber(detail.min)
						: `${formatNumber(detail.min)}–${formatNumber(detail.max)}`,
			});
		case "casino":
			return t("overview.detailCasino", { open: detail.open, total: detail.total });
	}
}
