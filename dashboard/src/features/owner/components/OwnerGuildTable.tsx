import { type OwnerGuildRow } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Avatar, Badge } from "@/components/primitives";
import { CELL, CELL_NUM, DataTable, TH, TH_NUM, WIDE_ONLY } from "@/components/primitives/DataTable";
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
		<DataTable
			caption={t("owner.guildTableCaption")}
			head={
				<>
					<th scope="col" className={TH}>
						{t("owner.server")}
					</th>
					<th scope="col" className={TH_NUM}>
						{t("owner.members")}
					</th>
					{/* Which features are on is the least urgent column, so it is the one a phone loses. */}
					<th scope="col" className={cn(TH, WIDE_ONLY)}>
						{t("owner.configured")}
					</th>
				</>
			}
		>
			{guilds.map((guild) => (
				<tr
					key={guild.id}
					className={cn("transition-colors duration-150", selected === guild.id ? "bg-muted/60" : "hover:bg-muted/40")}
				>
					<td className={CELL}>
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
					<td className={CELL_NUM}>{guild.memberCount.toLocaleString()}</td>
					<td className={cn(CELL, WIDE_ONLY)}>
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
		</DataTable>
	);
}
