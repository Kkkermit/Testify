import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { PageHeader, SectionHeading, Skeleton } from "@/components/primitives";
import { ChannelList } from "@/features/channels/components/ChannelList";
import { FeatureRows } from "@/features/channels/components/FeatureRows";
import { usePlaces } from "@/features/channels/usePlaces";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels } from "@/features/levelling/useLevelling";
import { usePageTitle } from "@/hooks/usePageTitle";
import { channelLabel } from "@/lib/channels";

export function ChannelsPage(): React.JSX.Element {
	const { guildId = "" } = useParams();
	const { t } = useTranslation();
	const overview = useGuildOverview(guildId);
	const channels = useChannels(guildId);
	const places = usePlaces(guildId);

	usePageTitle(t("nav.channels"), overview.data?.name);

	const failed = places.isError ? places : channels.isError ? channels : null;
	if (failed !== null) return <ErrorState error={failed.error} onRetry={() => void failed.refetch()} />;

	const header = <PageHeader server={overview.data} title={t("nav.channels")} subtitle={t("channel.listSubtitle")} />;
	if (places.data === undefined || channels.data === undefined) {
		return (
			<>
				{header}
				<Skeleton className="h-64" />
			</>
		);
	}

	const list = channels.data;
	const channelName = (id: string): string => channelLabel(list, id, t);

	return (
		<>
			{header}
			<ChannelList features={places.data.features} channels={list} guildId={guildId} />

			<section aria-labelledby="everywhere-heading" className="flex flex-col gap-3">
				<SectionHeading as="h2" id="everywhere-heading">
					{t("channel.everywhere")}
				</SectionHeading>
				<FeatureRows
					features={places.data.features.filter((feature) => feature.reach === "everywhere")}
					guildId={guildId}
					channelName={channelName}
				/>
			</section>
		</>
	);
}
