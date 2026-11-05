import { Hash, SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { EmptyState, PageHeader, Skeleton } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { featuresIn } from "@/features/channels/channelMap.utils";
import { ChannelBlocks } from "@/features/channels/components/ChannelBlocks";
import { usePlaces } from "@/features/channels/usePlaces";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels } from "@/features/levelling/useLevelling";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/cn";

export function ChannelPage(): React.JSX.Element {
	const { guildId = "", channelId = "" } = useParams();
	const { t } = useTranslation();
	const overview = useGuildOverview(guildId);
	const channels = useChannels(guildId);
	const places = usePlaces(guildId);
	const channel = channels.data?.find((candidate) => candidate.id === channelId && candidate.name !== null);

	usePageTitle(channel?.name ?? t("channel.unknown"));

	if (channels.isError) return <ErrorState error={channels.error} onRetry={() => void channels.refetch()} />;
	if (places.isError) return <ErrorState error={places.error} onRetry={() => void places.refetch()} />;
	if (channels.isPending || places.isPending) return <Skeleton className="h-64" />;

	if (channel?.name === undefined || channel.name === null || channel.kind === "category") {
		return (
			<>
				<PageHeader server={overview.data} title={t("channel.unknown")} />
				<EmptyState icon={<SearchX size={20} />} title={t("channel.notFound")} body={t("channel.notFoundHint")} />
			</>
		);
	}

	const here = featuresIn(places.data.features, channel.id);
	const name = channel.kind === "voice" ? channel.name : `#${channel.name}`;

	return (
		<>
			<PageHeader server={overview.data} title={name} subtitle={t("channel.subtitle")} />
			{here.length > 0 ? (
				<ChannelBlocks features={here} channelId={channel.id} channels={channels.data} guildId={guildId} />
			) : (
				<EmptyState
					icon={<Hash size={20} />}
					title={t("channel.nothingHere")}
					body={t("channel.nothingHereHint")}
					action={
						<Link
							to={`/guilds/${guildId}`}
							className={cn(INLINE_TARGET, "text-accent text-sm underline-offset-4 hover:underline")}
						>
							{t("channel.toOverview")}
						</Link>
					}
				/>
			)}
		</>
	);
}
