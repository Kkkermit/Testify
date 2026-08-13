import { type GuildOverview } from "@testify/shared";
import { History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, EmptyState } from "@/components/primitives";
import { dateAndTime, since } from "@/lib/datetime";

export function RecentChanges({ changes }: { changes: GuildOverview["recentChanges"] }): React.JSX.Element {
	const { t } = useTranslation();
	if (changes.length === 0) {
		return (
			<Card>
				<EmptyState
					icon={<History size={28} />}
					title={t("overview.nothingChanged")}
					body={t("overview.nothingChangedBody")}
				/>
			</Card>
		);
	}

	return (
		<Card padding="none">
			<ul className="divide-border divide-y">
				{/* The change is what identifies the row, so it takes the left column and the stamp goes right. */}
				{changes.map((change) => (
					<li
						key={`${change.at}-${change.action}`}
						className="hover:bg-muted/40 flex flex-wrap items-baseline gap-x-3 gap-y-1 px-6 py-3 text-sm transition-colors duration-150"
					>
						<span className="min-w-0 flex-1">{change.summary}</span>
						<span className="text-muted-foreground shrink-0 text-xs">{change.actorTag}</span>
						<time
							dateTime={change.at}
							title={dateAndTime(change.at)}
							className="text-muted-foreground shrink-0 text-xs tabular-nums"
						>
							{since(change.at)}
						</time>
					</li>
				))}
			</ul>
		</Card>
	);
}
