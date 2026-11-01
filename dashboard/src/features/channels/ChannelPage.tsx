import { Hash, SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { EmptyState, PageHeader, Skeleton } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { featuresIn } from "@/features/channels/channelMap.utils";
import { FeatureRows } from "@/features/channels/components/FeatureRows";
import { usePlaces } from "@/features/channels/usePlaces";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels } from "@/features/levelling/useLevelling";
import { usePageTitle } from "@/hooks/usePageTitle";
import { channelLabel } from "@/lib/channels";
import { cn } from "@/lib/cn";

/** What the bot does in one channel, each feature linking to its own page. */
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

	// A channel the reader cannot see is named nowhere, so it reads exactly like one that does not exist.
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
	const channelName = (id: string): string => channelLabel(channels.data, id, t);

	return (
		<>
			<PageHeader server={overview.data} title={name} subtitle={t("channel.subtitle")} />
			{here.length > 0 ? (
				<FeatureRows features={here} guildId={guildId} channelId={channel.id} channelName={channelName} />
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
