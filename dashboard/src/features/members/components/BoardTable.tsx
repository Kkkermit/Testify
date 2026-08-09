import { BOARD_LABELS, type BoardPage } from "@testify/shared";
import { Link } from "react-router";
import { Avatar, Badge, Card } from "@/components/primitives";
import { cn } from "@/lib/cn";

export function BoardTable({
	data,
	youId,
	guildId,
}: {
	data: BoardPage;
	youId: string | null;
	guildId: string;
}): React.JSX.Element {
	const labels = BOARD_LABELS[data.board];

	return (
		<Card padding="none" className="overflow-x-auto">
			<table className="w-full table-fixed text-sm">
				<caption className="sr-only">
					{labels.heading} in this server, highest first — page {data.page} of {data.pages}
				</caption>
				<thead className="text-muted-foreground border-border border-b">
					<tr>
						<th scope="col" className="w-12 px-3 py-3 text-right font-medium sm:w-16 sm:px-6">
							#
						</th>
						<th scope="col" className="px-3 py-3 text-left font-medium sm:px-6">
							Member
						</th>
						<th scope="col" className="w-24 px-3 py-3 text-right font-medium sm:w-32 sm:px-6">
							{labels.primary}
						</th>
						{/* The board is named after the primary figure, so on a phone that one stays and the extra goes. */}
						<th scope="col" className="hidden px-6 py-3 text-right font-medium sm:table-cell sm:w-32">
							{labels.secondary}
						</th>
					</tr>
				</thead>
				<tbody className="divide-border divide-y">
					{data.rows.map((row) => (
						<tr key={row.userId} className={cn(row.userId === youId && "bg-muted/60")}>
							<td className="px-3 py-3 text-right font-mono tabular-nums sm:px-6">{row.rank}</td>
							<th scope="row" className="px-3 py-3 text-left font-normal sm:px-6">
								<Link
									to={`/guilds/${guildId}/members/${row.userId}`}
									className="hover:text-accent flex min-w-0 items-center gap-2 transition-colors duration-150"
								>
									<Avatar name={row.displayName} url={row.avatarUrl} size={24} seed={row.userId} />
									<span className="truncate">{row.displayName}</span>
									{row.userId === youId && <Badge>You</Badge>}
									{!row.inGuild && <Badge tone="warning">Left</Badge>}
								</Link>
							</th>
							<td className="px-3 py-3 text-right font-mono tabular-nums sm:px-6">{row.primary.toLocaleString()}</td>
							<td className="text-muted-foreground hidden px-6 py-3 text-right font-mono tabular-nums sm:table-cell">
								{row.secondary.toLocaleString()}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</Card>
	);
}
