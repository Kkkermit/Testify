import { type OwnerGuildRow } from "@testify/shared";
import { Badge, Card, GuildIcon } from "@/components/primitives";

export function OwnerGuildTable({ guilds }: { guilds: OwnerGuildRow[] }): React.JSX.Element {
	return (
		<Card className="overflow-x-auto p-0">
			<table className="w-full text-sm">
				<caption className="sr-only">Servers Testify is in, largest first</caption>
				<thead className="text-muted-foreground border-border border-b">
					<tr>
						<th scope="col" className="px-6 py-3 text-left font-medium">
							Server
						</th>
						<th scope="col" className="px-6 py-3 text-right font-medium">
							Members
						</th>
						<th scope="col" className="px-6 py-3 text-left font-medium">
							Configured
						</th>
					</tr>
				</thead>
				<tbody className="divide-border divide-y">
					{guilds.map((guild) => (
						<tr key={guild.id} className="hover:bg-muted/40 transition-colors duration-150">
							<td className="px-6 py-3">
								<span className="flex items-center gap-2">
									<GuildIcon name={guild.name} url={guild.iconUrl} size={24} seed={guild.id} />
									<span className="truncate">{guild.name}</span>
								</span>
							</td>
							<td className="px-6 py-3 text-right font-mono tabular-nums">{guild.memberCount.toLocaleString()}</td>
							<td className="px-6 py-3">
								{guild.configured.length === 0 ? (
									<Badge tone="warning">Nothing set up</Badge>
								) : (
									<span className="flex flex-wrap gap-1">
										{guild.configured.map((feature) => (
											<Badge key={feature}>{feature}</Badge>
										))}
									</span>
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</Card>
	);
}
