import { BOARD_LABELS, type BoardPage } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Avatar, Badge } from "@/components/primitives";
import { CELL, CELL_NUM, DataTable, TH, TH_NUM, WIDE_ONLY } from "@/components/primitives/DataTable";
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
	const { t } = useTranslation();
	const labels = BOARD_LABELS[data.board];

	return (
		<DataTable
			caption={`${labels.heading} in this server, highest first — page ${String(data.page)} of ${String(data.pages)}`}
			head={
				<>
					<th scope="col" className={cn(TH_NUM, "w-12 sm:w-16")}>
						#
					</th>
					<th scope="col" className={TH}>
						{t("members.member")}
					</th>
					<th scope="col" className={TH_NUM}>
						{labels.primary}
					</th>
					{/* The board is named after the primary figure, so on a phone that one stays and the extra goes. */}
					<th scope="col" className={cn(TH_NUM, WIDE_ONLY)}>
						{labels.secondary}
					</th>
				</>
			}
		>
			{data.rows.map((row) => (
				<tr key={row.userId} className={cn(row.userId === youId && "bg-muted/60")}>
					<td className={CELL_NUM}>{row.rank}</td>
					<th scope="row" className={cn(CELL, "text-left font-normal")}>
						<Link
							to={`/guilds/${guildId}/members/${row.userId}`}
							className="hover:text-accent flex min-w-0 items-center gap-2 transition-colors duration-150"
						>
							<Avatar name={row.displayName} url={row.avatarUrl} size={24} seed={row.userId} />
							<span className="truncate">{row.displayName}</span>
							{row.userId === youId && <Badge>{t("members.you")}</Badge>}
							{!row.inGuild && <Badge tone="warning">{t("members.left")}</Badge>}
						</Link>
					</th>
					<td className={CELL_NUM}>{row.primary.toLocaleString()}</td>
					<td className={cn(CELL_NUM, WIDE_ONLY, "text-muted-foreground")}>{row.secondary.toLocaleString()}</td>
				</tr>
			))}
		</DataTable>
	);
}
