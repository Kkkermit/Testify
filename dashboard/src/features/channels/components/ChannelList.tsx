import { type ChannelSummary, type FeaturePlaces } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { DividedList, HoverChevron } from "@/components/primitives";
import { channelPath, channelTree, featuresIn } from "@/features/channels/channelMap.utils";
import { featureLabel } from "@/features/guild-overview/featureStatus.labels";

export function ChannelList({
	features,
	channels,
	guildId,
}: {
	features: readonly FeaturePlaces[];
	channels: readonly ChannelSummary[];
	guildId: string;
}): React.JSX.Element {
	const { t } = useTranslation();
	const busy = channelTree(channels)
		.flatMap((group) => group.channels)
		.map((channel) => ({ channel, here: featuresIn(features, channel.id) }))
		.filter(({ here }) => here.length > 0);

	if (busy.length === 0) return <p className="text-muted-foreground text-sm">{t("channel.nothingPlaced")}</p>;

	return (
		<DividedList className="bg-card">
			{busy.map(({ channel, here }) => (
				<li key={channel.id}>
					<Link
						to={channelPath(guildId, channel.id)}
						className="hover:bg-muted/60 group flex items-center gap-3 px-4 py-3 transition-colors duration-150"
					>
						<span className="min-w-0 flex-1">
							<span className="block truncate font-medium">
								{channel.kind === "voice" ? channel.name : `#${channel.name}`}
							</span>
							<span className="text-muted-foreground block truncate text-sm">
								{here.map((feature) => featureLabel(feature.key, feature.label, t)).join(" · ")}
							</span>
						</span>
						<HoverChevron />
					</Link>
				</li>
			))}
		</DividedList>
	);
}
