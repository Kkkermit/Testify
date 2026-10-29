import { type OwnerGuildFilter, type OwnerGuildRow, type OwnerGuildSort } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Avatar, Badge, CELL, CELL_NUM, DataTable, LARGE_ONLY, TH, TH_NUM, WIDE_ONLY } from "@/components/primitives";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/datetime";
import { formatNumber } from "@/lib/intl";

export function OwnerGuildTable({
	guilds,
	sort = "members",
	filter = "all",
	empty = null,
	selected,
	onSelect,
}: {
	guilds: OwnerGuildRow[];
	sort?: OwnerGuildSort;
	filter?: OwnerGuildFilter;
	/** Said in place of an empty table, when a search is what emptied it. */
	empty?: string | null;
	selected?: string | null;
	onSelect?: (guildId: string) => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	// A wide-screen column stays on a phone while the list is sorted by it.
	const shown = (column: "joined" | "commands" | "dashboard"): string | false => {
		const active = { joined: ["newest", "oldest"], commands: ["commands", "quietest"], dashboard: ["dashboard"] }[
			column
		];
		// An inactive server is only worth leaving once it has had time to be used, so when it joined stays in view.
		if (column === "joined" && filter === "inactive") return false;
		return !active.includes(sort) && LARGE_ONLY;
	};

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
					<th scope="col" className={cn(TH_NUM, "w-28 sm:w-36", shown("joined"))}>
						{t("owner.joined")}
					</th>
					<th scope="col" className={cn(TH_NUM, shown("commands"))}>
						{t("owner.commands30d")}
					</th>
					<th scope="col" className={cn(TH_NUM, shown("dashboard"))}>
						{t("owner.dashboard30d")}
					</th>
					{/* Which features are on is the least urgent column, so it is the one a phone loses. */}
					<th scope="col" className={cn(TH, WIDE_ONLY)}>
						{t("owner.configured")}
					</th>
				</>
			}
		>
			{guilds.length === 0 && empty !== null && (
				<tr>
					<td colSpan={6} className={cn(CELL, "text-muted-foreground")}>
						{empty}
					</td>
				</tr>
			)}
			{guilds.map((guild) => (
				<tr
					key={guild.id}
					className={cn("transition-colors duration-150", selected === guild.id ? "bg-muted/60" : "hover:bg-muted/40")}
				>
					<td className={CELL}>
						{onSelect === undefined ? (
							<span className="flex min-w-0 items-center gap-2">
								<Avatar name={guild.name} url={guild.iconUrl} size={24} seed={guild.id} />
								<span className="min-w-0 truncate" title={guild.name}>
									{guild.name}
								</span>
							</span>
						) : (
							// A button rather than a clickable row: a row is not focusable and announces nothing.
							<button
								type="button"
								aria-pressed={selected === guild.id}
								onClick={() => {
									onSelect(guild.id);
								}}
								className="hover:text-accent flex w-full min-w-0 items-center gap-2 text-left transition-colors duration-150"
							>
								<Avatar name={guild.name} url={guild.iconUrl} size={24} seed={guild.id} />
								<span className="min-w-0 truncate" title={guild.name}>
									{guild.name}
								</span>
							</button>
						)}
					</td>
					<td className={CELL_NUM}>{formatNumber(guild.memberCount)}</td>
					<td className={cn(CELL_NUM, "font-sans whitespace-nowrap", shown("joined"))}>
						{guild.joinedAt === null ? "—" : shortDate(guild.joinedAt)}
					</td>
					<td className={cn(CELL_NUM, shown("commands"))}>{formatNumber(guild.commands)}</td>
					<td className={cn(CELL_NUM, shown("dashboard"))}>{formatNumber(guild.dashboardViews)}</td>
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
