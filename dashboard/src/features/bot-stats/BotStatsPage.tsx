import { Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { ChannelPicker, SavingIndicator, savingStateOf, Warning } from "@/components/form";
import { Badge, Button, Card, CARD_HEADING, PageHeader, Skeleton } from "@/components/primitives";
import { placementOf, postActionOf } from "@/features/bot-stats/botStats.utils";
import { usePostBotStats, useBotStats, useRemoveBotStats } from "@/features/bot-stats/useBotStats";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels } from "@/features/levelling/useLevelling";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";

export function BotStatsPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();

	const stats = useBotStats(guildId);
	const channels = useChannels(guildId);
	const overview = useGuildOverview(guildId);
	const post = usePostBotStats(guildId);
	const remove = useRemoveBotStats(guildId);
	const [chosen, setChosen] = useState<string | null>(null);

	usePageTitle(t("botStats.title"), overview.data?.name);

	if (stats.isError) return <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />;
	if (stats.isPending) return <Skeleton className="h-96 w-full" />;

	const settings = stats.data;
	const placement = placementOf(settings, channels.data ?? []);
	// A deleted channel cannot be posted in again, so the picker starts empty rather than holding it.
	const target = chosen ?? (placement.kind === "posted" ? settings.channelId : null);
	const action = postActionOf(settings, chosen);
	const busy = post.isPending || remove.isPending;
	const failure = post.error ?? remove.error;

	return (
		<>
			<PageHeader
				eyebrow={overview.data?.name}
				title={t("botStats.title")}
				subtitle={t("botStats.subtitle")}
				action={<SavingIndicator state={savingStateOf(busy, post.isSuccess || remove.isSuccess)} />}
			/>

			<Card className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex flex-col gap-1">
					<div className="flex flex-wrap items-center gap-3">
						<h2 className={CARD_HEADING}>{t("botStats.where")}</h2>
						{placement.kind === "none" ? (
							<Badge>{t("botStats.notPosted")}</Badge>
						) : (
							<Badge tone="success">{t("botStats.posted")}</Badge>
						)}
					</div>
					<p className="text-muted-foreground text-sm">
						{placement.kind === "none"
							? t("botStats.noneBody")
							: placement.kind === "gone"
								? t("botStats.goneBody")
								: t("botStats.postedBody", { channel: placement.name })}
					</p>
				</div>

				{placement.kind !== "none" && (
					<Button
						variant="ghost"
						disabled={busy}
						onClick={() => {
							remove.mutate();
						}}
					>
						<Trash2 size={16} aria-hidden="true" /> {t("botStats.remove")}
					</Button>
				)}
			</Card>

			<Card className="flex flex-col gap-4">
				<div>
					<h2 className={CARD_HEADING}>{t("botStats.chooseTitle")}</h2>
					<p className="text-muted-foreground text-sm">{t("botStats.chooseBody")}</p>
				</div>

				{channels.isError ? (
					<ErrorState as="h2" error={channels.error} onRetry={() => void channels.refetch()} />
				) : (
					<ChannelPicker
						label={t("botStats.channel")}
						hint={t("botStats.channelHint")}
						channels={channels.data ?? []}
						value={target}
						allowNone={false}
						onChange={setChosen}
					/>
				)}

				{failure !== null && (
					<Warning>{failure instanceof ApiError ? failure.message : t("common.couldNotSave")}</Warning>
				)}

				<div>
					<Button
						disabled={target === null || busy}
						onClick={() => {
							if (target === null) return;
							post.mutate(
								{ channelId: target },
								{
									onSuccess: () => {
										setChosen(null);
									},
								},
							);
						}}
					>
						<Send size={16} aria-hidden="true" />{" "}
						{action === "post"
							? t("botStats.postAction")
							: action === "move"
								? t("botStats.moveAction")
								: t("botStats.repostAction")}
					</Button>
				</div>
			</Card>
		</>
	);
}
