import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { PageHeader, Skeleton } from "@/components/primitives";
import { FeatureRows } from "@/features/channels/components/FeatureRows";
import { usePlaces } from "@/features/channels/usePlaces";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels } from "@/features/levelling/useLevelling";
import { usePageTitle } from "@/hooks/usePageTitle";
import { channelLabel } from "@/lib/channels";

/** The features that belong to no one channel, each linking to its own page. */
export function EverywherePage(): React.JSX.Element {
	const { guildId = "" } = useParams();
	const { t } = useTranslation();
	const overview = useGuildOverview(guildId);
	const channels = useChannels(guildId);
	const places = usePlaces(guildId);

	usePageTitle(t("nav.everywhere"));

	if (places.isError) return <ErrorState error={places.error} onRetry={() => void places.refetch()} />;

	// Until the list answers a channel is "…".
	const channelName = (id: string): string => (channels.data === undefined ? "…" : channelLabel(channels.data, id, t));

	return (
		<>
			<PageHeader server={overview.data} title={t("nav.everywhere")} subtitle={t("channel.everywhereSubtitle")} />
			{places.isPending ? (
				<Skeleton className="h-64" />
			) : (
				<FeatureRows
					features={places.data.features.filter((feature) => feature.reach === "everywhere")}
					guildId={guildId}
					channelName={channelName}
				/>
			)}
		</>
	);
}
