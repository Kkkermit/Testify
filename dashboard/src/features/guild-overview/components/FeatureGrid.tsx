import { type GuildOverview } from "@testify/shared";
import { Reveal } from "@/components/motion";
import { Badge, Card } from "@/components/primitives";

export function FeatureGrid({ features }: { features: GuildOverview["features"] }): React.JSX.Element {
	return (
		<ul className="grid gap-3 sm:grid-cols-2">
			{features.map((feature, index) => (
				<Reveal as="li" key={feature.key} index={index}>
					<Card className="hover:border-input flex items-center justify-between gap-3 p-4 transition-colors duration-150">
						<span className="min-w-0">
							<span className="block font-medium">{feature.label}</span>
							<span className="text-muted-foreground block truncate text-xs">{feature.detail ?? "Not set up"}</span>
						</span>
						<Badge tone={feature.enabled ? "success" : "muted"}>{feature.enabled ? "On" : "Off"}</Badge>
					</Card>
				</Reveal>
			))}
		</ul>
	);
}
