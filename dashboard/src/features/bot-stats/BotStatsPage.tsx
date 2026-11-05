import { Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { ChannelPicker, RowActions, SavingIndicator, savingStateOf, SettingRows, Warning } from "@/components/form";
import { Button, PageHeader, Skeleton, Summary } from "@/components/primitives";
import { placementOf, postActionOf } from "@/features/bot-stats/botStats.utils";
import { usePostBotStats, useBotStats, useRemoveBotStats } from "@/features/bot-stats/useBotStats";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels } from "@/features/levelling/useLevelling";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { channelLabel } from "@/lib/channels";

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
	const target = chosen ?? (placement.kind === "posted" ? settings.channelId : null);
	const action = postActionOf(settings, chosen);
	const busy = post.isPending || remove.isPending;
	const failure = post.error ?? remove.error;

	return (
		<>
			<PageHeader
				server={overview.data}
				title={t("botStats.title")}
				subtitle={t("botStats.subtitle")}
				action={<SavingIndicator state={savingStateOf(busy, post.isSuccess || remove.isSuccess)} />}
			/>

			<Summary>
				{placement.kind === "none"
					? t("botStats.noneBody")
					: placement.kind === "gone"
						? t("botStats.goneBody")
						: t("botStats.postedBody", { channel: channelLabel(channels.data ?? [], settings.channelId, t) })}
			</Summary>

			<SettingRows title={t("botStats.chooseTitle")} description={t("botStats.chooseBody")}>
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

				<RowActions>
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
				</RowActions>
			</SettingRows>
		</>
	);
}
