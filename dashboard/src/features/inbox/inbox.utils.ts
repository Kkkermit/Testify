import { type ChannelSummary, type GuildInbox, inboxCount, type InboxChannelProblem } from "@testify/shared";
import { type TFunction } from "i18next";
import { featureLabel } from "@/features/guild-overview/featureStatus.labels";
import { channelLabel } from "@/lib/channels";

export function inboxSummary(inbox: GuildInbox, t: TFunction): string {
	const count = inboxCount(inbox);
	return count === 0 ? t("inbox.summaryClear") : t("inbox.summary", { count });
}

export function moreThan(list: { total: number; items: readonly unknown[] }): number {
	return Math.max(0, list.total - list.items.length);
}

export function channelProblemText(
	problem: InboxChannelProblem,
	channels: readonly ChannelSummary[],
	t: TFunction,
): string {
	const feature = featureLabel(problem.feature, problem.label, t);
	return problem.problem === "missing"
		? t("inbox.missing", { feature })
		: t("inbox.cannotPost", { feature, channel: channelLabel(channels, problem.channelId, t) });
}
