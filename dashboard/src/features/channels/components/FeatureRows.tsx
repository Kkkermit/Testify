import { type FeaturePlaces } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Badge, DividedList, HoverChevron } from "@/components/primitives";
import { featureLook } from "@/config/features";
import { describeDetail, featureLabel } from "@/features/guild-overview/featureStatus.labels";
import { cn } from "@/lib/cn";

export function FeatureRows({
	features,
	guildId,
	channelName,
}: {
	features: readonly FeaturePlaces[];
	guildId: string;
	channelName: (id: string) => string;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<DividedList className="bg-card">
			{features.map((feature) => {
				const { icon: Icon, path } = featureLook(feature.key);
				const line = feature.detail === null ? t("overview.notSetUp") : describeDetail(feature.detail, t, channelName);

				const body = (
					<>
						<Icon size={18} aria-hidden="true" className="text-muted-foreground shrink-0" />
						<span className="min-w-0 flex-1">
							<span className="block truncate font-medium">{featureLabel(feature.key, feature.label, t)}</span>
							<span className="text-muted-foreground block truncate text-sm">{line}</span>
						</span>
						<Badge tone={feature.enabled ? "success" : "muted"}>
							{feature.enabled ? t("common.on") : t("common.off")}
						</Badge>
					</>
				);
				const row = "flex items-center gap-3 px-4 py-3";

				return (
					<li key={feature.key}>
						{path === undefined ? (
							<div className={row}>{body}</div>
						) : (
							<Link to={path(guildId)} className={cn(row, "hover:bg-muted/60 group transition-colors duration-150")}>
								{body}
								<HoverChevron />
							</Link>
						)}
					</li>
				);
			})}
		</DividedList>
	);
}
