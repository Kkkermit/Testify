import { type CommandUsageRow, type GuildUsageRow, type PanelFormRow } from "@testify/shared";
import { type TFunction } from "i18next";
import { Link } from "react-router";
import { Avatar } from "@/components/primitives";
import { commandBar, searchWith } from "@/features/owner/owner.utils";
import { type Bars } from "@/features/owner/usage/usage.utils";
import { formatNumber, formatPercent } from "@/lib/intl";

const LINK = "hover:text-accent transition-colors duration-150";

/** A command's name that opens it in depth, keeping the window; a right-click action has no page to open. */
export function commandLink(row: Pick<CommandUsageRow, "command" | "menu">, params: URLSearchParams): React.ReactNode {
	if (row.menu) return row.command;
	return (
		<Link to={searchWith(params, { command: row.command })} className={LINK}>
			/{row.command}
		</Link>
	);
}

export function commandLinkBar(row: CommandUsageRow, params: URLSearchParams, t: TFunction): Bars[number] {
	return { ...commandBar(row, t), label: commandLink(row, params) };
}

/** A server as a bar whose name opens its own figures, keeping the window and the view. */
export function guildBar(row: GuildUsageRow, params: URLSearchParams, t: TFunction): Bars[number] {
	return {
		id: row.guildId,
		label: (
			<Link to={searchWith(params, { guild: row.guildId })} className={`${LINK} flex items-center gap-2`}>
				<Avatar name={row.name} url={row.iconUrl} size={18} seed={row.guildId} />
				<span className="truncate">{row.name}</span>
			</Link>
		),
		sub: t("common.memberCount", { count: row.memberCount }),
		count: row.count,
	};
}

/** Text as the code writes it: a handler, an option, a route or an error code. */
export const codeLabel = (text: string): React.JSX.Element => <code className="font-mono text-sm">{text}</code>;

/** Forms by how many were opened and left, which is what a form that puts people off looks like. */
export function formBars(rows: PanelFormRow[], t: TFunction): Bars {
	return rows.map((row) => {
		const abandoned = Math.max(0, row.shown - row.submitted);
		return {
			id: row.id,
			label: codeLabel(row.id),
			sub: t("owner.usageSections.formSub", {
				shown: formatNumber(row.shown),
				submitted: formatNumber(Math.min(row.submitted, row.shown)),
			}),
			count: abandoned,
			value: t("owner.usageSections.abandoned", { share: formatPercent(abandoned, row.shown) }),
		};
	});
}
