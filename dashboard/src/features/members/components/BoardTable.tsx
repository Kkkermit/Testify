import { BOARD_LABELS, type BoardPage } from "@testify/shared";
import { Avatar, Badge, Card } from "@/components/primitives";
import { cn } from "@/lib/cn";

export function BoardTable({ data, youId }: { data: BoardPage; youId: string | null }): React.JSX.Element {
	const labels = BOARD_LABELS[data.board];

	return (
		<Card padding="none" className="overflow-x-auto">
			<table className="w-full text-sm">
				<caption className="sr-only">
					{labels.heading} in this server, highest first — page {data.page} of {data.pages}
				</caption>
				<thead className="text-muted-foreground border-border border-b">
					<tr>
						<th scope="col" className="w-16 px-6 py-3 text-right font-medium">
							#
						</th>
						<th scope="col" className="px-6 py-3 text-left font-medium">
							Member
						</th>
						<th scope="col" className="px-6 py-3 text-right font-medium">
							{labels.primary}
						</th>
						<th scope="col" className="px-6 py-3 text-right font-medium">
							{labels.secondary}
						</th>
					</tr>
				</thead>
				<tbody className="divide-border divide-y">
					{data.rows.map((row) => (
						<tr key={row.userId} className={cn(row.userId === youId && "bg-muted/60")}>
							<td className="px-6 py-3 text-right font-mono tabular-nums">{row.rank}</td>
							<th scope="row" className="px-6 py-3 text-left font-normal">
								<span className="flex items-center gap-2">
									<Avatar name={row.displayName} url={row.avatarUrl} size={24} seed={row.userId} />
									<span className="truncate">{row.displayName}</span>
									{row.userId === youId && <Badge>You</Badge>}
									{!row.inGuild && <Badge tone="warning">Left</Badge>}
								</span>
							</th>
							<td className="px-6 py-3 text-right font-mono tabular-nums">{row.primary.toLocaleString()}</td>
							<td className="text-muted-foreground px-6 py-3 text-right font-mono tabular-nums">
								{row.secondary.toLocaleString()}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</Card>
	);
}
