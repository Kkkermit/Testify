import { type ChannelSummary, type FeaturePlaces } from "@testify/shared";
import { GripVertical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { featureLook } from "@/config/features";
import { PlaceIn } from "@/features/channels/components/PlaceIn";
import { DRAG_FEATURE, dragKindType, placementOf } from "@/features/channels/placement";
import { featureLabel } from "@/features/guild-overview/featureStatus.labels";
import { cn } from "@/lib/cn";

/** Features that need a channel and have none: dragged onto one in the sidebar, placed from a list, or set up on their page. */
export function WaitingChips({
	features,
	channels,
	guildId,
}: {
	features: readonly FeaturePlaces[];
	channels: readonly ChannelSummary[];
	guildId: string;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
			{features.map((feature) => {
				const placeable = placementOf(feature.key) !== undefined && feature.accepts !== null;
				const { path } = featureLook(feature.key);
				const name = featureLabel(feature.key, feature.label, t);

				return (
					<li
						key={feature.key}
						draggable={placeable}
						onDragStart={(event) => {
							if (!placeable || feature.accepts === null) return;
							event.dataTransfer.setData(DRAG_FEATURE, feature.key);
							event.dataTransfer.setData(dragKindType(feature.accepts), "1");
							event.dataTransfer.effectAllowed = "move";
						}}
						className={cn(
							"bg-card border-border rounded-card flex items-start gap-2 border px-3 py-2",
							placeable && "cursor-grab active:cursor-grabbing",
						)}
					>
						{placeable && (
							<GripVertical size={16} aria-hidden="true" className="text-muted-foreground mt-1.5 shrink-0" />
						)}
						<span className="flex min-w-0 flex-1 flex-col gap-2">
							<span className="pt-1 text-sm font-medium">{name}</span>
							{placeable ? (
								<PlaceIn feature={feature} channels={channels} guildId={guildId} />
							) : (
								path !== undefined && (
									<Link
										to={path(guildId)}
										aria-label={t("overview.setUpLabel", { feature: name })}
										className={cn(INLINE_TARGET, "text-accent text-sm underline-offset-4 hover:underline")}
									>
										{t("overview.setUp")}
									</Link>
								)
							)}
						</span>
					</li>
				);
			})}
		</ul>
	);
}
