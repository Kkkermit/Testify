import { ACCOUNT_LIMITS, type AccountChange } from "@testify/shared";
import { History } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { Field } from "@/components/form";
import { SELECT } from "@/components/form/fieldStyles";
import { Badge, Card, DividedList, EmptyState, Pager, Skeleton, Summary } from "@/components/primitives";
import { changeLink } from "@/features/account/account.utils";
import { useAccountHistory } from "@/features/account/useAccount";
import { useMe } from "@/features/auth/useMe";
import { pageCountOf } from "@/features/warnings/warnings.utils";
import { dateAndTime, since } from "@/lib/datetime";
import { currentData } from "@/lib/queries";

export function HistoryTab(): React.JSX.Element {
	const { t } = useTranslation();
	const me = useMe();
	const [page, setPage] = useState(1);
	const [server, setServer] = useState("");
	const history = useAccountHistory(page, server);
	const results = currentData(history);

	if (history.isError) return <ErrorState as="h2" error={history.error} onRetry={() => void history.refetch()} />;
	if (history.isPending) return <Skeleton className="h-64 w-full" />;

	const { servers, total, perPage } = history.data;
	const guilds = me.data?.guilds ?? [];

	return (
		<>
			{results !== undefined && (
				<Summary>{t("account.historySummary", { count: results.total, days: ACCOUNT_LIMITS.historyDays })}</Summary>
			)}

			{servers.length > 1 && (
				<Card>
					<Field label={t("account.historyServer")} htmlFor="history-server">
						<select
							id="history-server"
							className={SELECT}
							value={server}
							onChange={(event) => {
								setServer(event.target.value);
								setPage(1);
							}}
						>
							<option value="">{t("account.everyServer")}</option>
							{servers.map((option) => (
								<option key={option.id} value={option.id}>
									{option.name ?? t("account.leftServer")}
								</option>
							))}
						</select>
					</Field>
				</Card>
			)}

			{results === undefined ? (
				<Skeleton className="h-64 w-full" />
			) : results.items.length === 0 ? (
				<EmptyState
					icon={<History size={28} />}
					title={t("account.historyNone")}
					body={t("account.historyNoneBody", { days: ACCOUNT_LIMITS.historyDays })}
				/>
			) : (
				<Card padding="none">
					<DividedList className="rounded-card border-0">
						{results.items.map((change) => (
							<HistoryRow key={change.id} change={change} link={changeLink(change, guilds)} />
						))}
					</DividedList>
				</Card>
			)}

			<Pager page={page} pages={pageCountOf(total, perPage)} onChange={setPage} />
		</>
	);
}

function HistoryRow({ change, link }: { change: AccountChange; link: string | null }): React.JSX.Element {
	const { t } = useTranslation();
	const where = change.guildName ?? (change.guildId === null ? t("account.ownerConsole") : t("account.leftServer"));

	return (
		<li className="flex flex-col gap-1 px-6 py-3">
			<div className="flex flex-wrap items-center gap-2 text-sm">
				<span className="min-w-0 flex-1 break-words">{change.summary}</span>
				<Badge>{change.source === "command" ? t("account.inDiscord") : t("account.onDashboard")}</Badge>
			</div>
			<p className="text-muted-foreground text-xs">
				{link === null ? (
					<span>{where}</span>
				) : (
					<Link to={link} className="hover:text-foreground underline-offset-4 hover:underline">
						{where}
					</Link>
				)}
				{" · "}
				<time dateTime={change.at} title={since(change.at)} className="tabular-nums">
					{dateAndTime(change.at)}
				</time>
			</p>
		</li>
	);
}
