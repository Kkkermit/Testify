import { type GuildOverview } from "@testify/shared";
import { ChevronRight } from "lucide-react";
import { type ReactNode } from "react";
import { Link } from "react-router";
import { Reveal } from "@/components/motion";
import { Badge, cardClass } from "@/components/primitives";
import { featureLook } from "@/config/features";
import { cn } from "@/lib/cn";

/** A card links to its settings screen where the dashboard has one, and is inert where the feature is Discord-only. */
export function FeatureGrid({
	features,
	guildId,
}: {
	features: GuildOverview["features"];
	guildId: string;
}): React.JSX.Element {
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
							<span className="block truncate font-medium">{feature.label}</span>
							<span className="text-muted-foreground block truncate text-xs">{feature.detail ?? "Not set up"}</span>
						</span>
						<Badge tone={feature.enabled ? "success" : "muted"}>{feature.enabled ? "On" : "Off"}</Badge>
					</>
				);

				const surface = cardClass("compact", "flex items-center gap-3 transition-colors duration-150");

				return (
					<Reveal as="li" key={feature.key} index={index}>
						{path === undefined ? (
							<div className={surface}>{body}</div>
						) : (
							<Link to={path(guildId)} className={cn(surface, "hover:border-input group")}>
								{body}
								<ChevronRight
									size={16}
									aria-hidden="true"
									className="text-muted-foreground shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
								/>
							</Link>
						)}
					</Reveal>
				);
			})}
		</ul>
	);
}
