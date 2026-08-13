import { type OwnerGuildRow } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Badge, Card, Avatar } from "@/components/primitives";
import { cn } from "@/lib/cn";

export function OwnerGuildTable({
	guilds,
	selected,
	onSelect,
}: {
	guilds: OwnerGuildRow[];
	selected?: string | null;
	onSelect?: (guildId: string) => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	return (
		<Card padding="none" className="overflow-x-auto">
			<table className="w-full table-fixed text-sm">
				<caption className="sr-only">{t("owner.guildTableCaption")}</caption>
				<thead className="text-muted-foreground border-border border-b">
					<tr>
						<th scope="col" className="px-3 py-3 text-left font-medium sm:px-6">
							Server
						</th>
						<th scope="col" className="w-24 px-3 py-3 text-right font-medium sm:w-32 sm:px-6">
							Members
						</th>
						{/* Which features are on is the least urgent column, so it is the one a phone loses. */}
						<th scope="col" className="hidden px-6 py-3 text-left font-medium sm:table-cell">
							Configured
						</th>
					</tr>
				</thead>
				<tbody className="divide-border divide-y">
					{guilds.map((guild) => (
						<tr
							key={guild.id}
							className={cn(
								"transition-colors duration-150",
								selected === guild.id ? "bg-muted/60" : "hover:bg-muted/40",
							)}
						>
							<td className="px-3 py-3 sm:px-6">
								{onSelect === undefined ? (
									<span className="flex items-center gap-2">
										<Avatar name={guild.name} url={guild.iconUrl} size={24} seed={guild.id} />
										<span className="truncate">{guild.name}</span>
									</span>
								) : (
									// A button rather than a clickable row: a row is not focusable and announces nothing.
									<button
										type="button"
										aria-pressed={selected === guild.id}
										onClick={() => {
											onSelect(guild.id);
										}}
										className="hover:text-accent flex items-center gap-2 text-left transition-colors duration-150"
									>
										<Avatar name={guild.name} url={guild.iconUrl} size={24} seed={guild.id} />
										<span className="truncate">{guild.name}</span>
									</button>
								)}
							</td>
							<td className="px-3 py-3 text-right font-mono tabular-nums sm:px-6">
								{guild.memberCount.toLocaleString()}
							</td>
							<td className="hidden px-6 py-3 sm:table-cell">
								{guild.configured.length === 0 ? (
									<Badge tone="warning">{t("owner.nothingSetUp")}</Badge>
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
