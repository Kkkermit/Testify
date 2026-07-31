import { type GuildOverview } from "@testify/shared";
import { History } from "lucide-react";
import { Card, EmptyState } from "@/components/primitives";

export function RecentChanges({ changes }: { changes: GuildOverview["recentChanges"] }): React.JSX.Element {
	if (changes.length === 0) {
		return (
			<Card>
				<EmptyState
					icon={<History size={28} />}
					title="Nothing changed here yet"
					body="Every change made from this dashboard is recorded, so you can see who turned what off and when."
				/>
			</Card>
		);
	}

	return (
		<Card className="p-0">
			<ul className="divide-border divide-y">
				{changes.map((change) => (
					<li
						key={`${change.at}-${change.action}`}
						className="hover:bg-muted/40 flex items-baseline gap-3 px-6 py-3 text-sm transition-colors duration-150"
					>
						<time dateTime={change.at} className="text-muted-foreground shrink-0 tabular-nums">
							{new Date(change.at).toLocaleString()}
						</time>
						<span className="min-w-0 flex-1">{change.summary}</span>
						<span className="text-muted-foreground shrink-0 text-xs">{change.actorTag}</span>
					</li>
				))}
			</ul>
		</Card>
	);
}
