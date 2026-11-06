import { type InviteJoin, type InviteSettings } from "@testify/shared";
import { type TFunction } from "i18next";
import { personName } from "@/lib/people";

export function inviteSummary(settings: InviteSettings, channel: string, t: TFunction): string {
	if (!settings.canRead) return t("invites.summaryCannotRead");
	if (!settings.enabled) return t("invites.summaryOff");
	return settings.logChannelId === null ? t("invites.summaryOn") : t("invites.summaryOnPosting", { channel });
}

/** How one member joined, worded for the list of recent joins. */
export function joinedHow(join: InviteJoin, t: TFunction): string {
	if (join.vanity) return t("invites.viaVanity");
	if (join.inviterId === null) return t("invites.viaUnknown");
	return t("invites.viaInvite", {
		name: personName(join.inviterName ?? t("common.unknownAccount"), t),
		code: join.code ?? "",
	});
}
