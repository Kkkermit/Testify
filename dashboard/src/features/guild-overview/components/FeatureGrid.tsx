import { type GuildOverview } from "@testify/shared";
import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Reveal } from "@/components/motion";
import { Badge, CARD_ROW, cardClass, HoverChevron } from "@/components/primitives";
import { featureLook } from "@/config/features";
import { describeDetail, featureLabel } from "@/features/guild-overview/featureStatus.labels";
import { useChannels } from "@/features/levelling/useLevelling";
import { cn } from "@/lib/cn";

/** A card links to its settings screen where the dashboard has one, and is inert where the feature is Discord-only. */
export function FeatureGrid({
	features,
	guildId,
}: {
	features: GuildOverview["features"];
	guildId: string;
}): React.JSX.Element {
	const { t } = useTranslation();
	const channels = useChannels(guildId);
	// Until the list answers a channel is "…", and a channel missing from it has been deleted.
	const channelName = (id: string): string | null =>
		channels.data === undefined ? "…" : (channels.data.find((channel) => channel.id === id)?.name ?? null);

	return (
		// A grid item defaults to `min-width: auto`, so without this the widest tile sets the row's width.
		<ul className="grid gap-4 sm:grid-cols-2 [&>li]:min-w-0">
			{features.map((feature, index) => {
				const { icon: Icon, tint, wash, path } = featureLook(feature.key);

				const body: ReactNode = (
					<>
						<span className={cn("rounded-card shrink-0 p-2", wash, tint)} aria-hidden="true">
							<Icon size={18} />
						</span>
						<span className="min-w-0 flex-1">
							<span className="block truncate font-medium">{featureLabel(feature.key, feature.label, t)}</span>
							<span className="text-muted-foreground block truncate text-xs">
								{feature.detail === null ? t("overview.notSetUp") : describeDetail(feature.detail, t, channelName)}
							</span>
						</span>
						<Badge tone={feature.enabled ? "success" : "muted"}>
							{feature.enabled ? t("common.on") : t("common.off")}
						</Badge>
					</>
				);

				const surface = cardClass("compact", CARD_ROW);

				return (
					<Reveal as="li" key={feature.key} index={index}>
						{path === undefined ? (
							<div className={surface}>{body}</div>
						) : (
							<Link to={path(guildId)} className={cn(surface, "hover:border-input group")}>
								{body}
								<HoverChevron />
							</Link>
						)}
					</Reveal>
				);
			})}
		</ul>
	);
}
