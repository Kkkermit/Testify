import { type AccountSession } from "@testify/shared";
import { Laptop, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/app/ErrorState";
import { RowActions, Warning } from "@/components/form";
import { Badge, Button, Card, DividedList, Skeleton, Summary } from "@/components/primitives";
import { sessionsInOrder } from "@/features/account/account.utils";
import { useAccountSessions, useEndOtherSessions, useEndSession } from "@/features/account/useAccount";
import { dateAndTime, shortDate, since } from "@/lib/datetime";

export function SessionsTab(): React.JSX.Element {
	const { t } = useTranslation();
	const sessions = useAccountSessions();
	const end = useEndSession();
	const endOthers = useEndOtherSessions();

	if (sessions.isError) return <ErrorState as="h2" error={sessions.error} onRetry={() => void sessions.refetch()} />;
	if (sessions.isPending) return <Skeleton className="h-48 w-full" />;

	const listed = sessionsInOrder(sessions.data);
	const others = listed.filter((session) => !session.current).length;

	return (
		<>
			<Summary>{t("account.sessionsSummary", { count: listed.length })}</Summary>
			{(end.error !== null || endOthers.error !== null) && <Warning>{t("account.sessionEndFailed")}</Warning>}
			{endOthers.isSuccess && (
				<p role="status" className="text-success text-sm">
					{t("account.sessionsEnded", { count: endOthers.data.ended })}
				</p>
			)}

			<Card padding="none">
				<DividedList className="rounded-card border-0">
					{listed.map((session) => (
						<SessionRow
							key={session.id}
							session={session}
							busy={end.isPending && end.variables === session.id}
							onEnd={() => {
								end.mutate(session.id);
							}}
						/>
					))}
				</DividedList>
			</Card>

			{others > 0 && (
				<RowActions>
					<Button
						variant="secondary"
						disabled={endOthers.isPending}
						onClick={() => {
							endOthers.mutate();
						}}
					>
						<LogOut size={16} aria-hidden="true" /> {t("account.endOthers")}
					</Button>
				</RowActions>
			)}
			<p className="text-muted-foreground max-w-prose text-xs">{t("account.sessionsPrivacy")}</p>
		</>
	);
}

function SessionRow({
	session,
	busy,
	onEnd,
}: {
	session: AccountSession;
	busy: boolean;
	onEnd: () => void;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-3">
			<div className="flex min-w-0 items-center gap-3">
				<Laptop size={18} aria-hidden="true" className="text-muted-foreground shrink-0" />
				<div className="flex min-w-0 flex-col gap-1">
					<p className="flex flex-wrap items-center gap-2 text-sm">
						{t("account.sessionSince", { date: shortDate(session.createdAt) })}
						{session.current && <Badge tone="success">{t("account.thisBrowser")}</Badge>}
					</p>
					<p className="text-muted-foreground text-xs">
						<time dateTime={session.lastSeenAt} title={dateAndTime(session.lastSeenAt)}>
							{t("account.sessionLastUsed", { when: since(session.lastSeenAt) })}
						</time>
						{" · "}
						{t("account.sessionEnds", { date: shortDate(session.expiresAt) })}
					</p>
				</div>
			</div>
			{!session.current && (
				<Button variant="ghost" disabled={busy} onClick={onEnd}>
					<LogOut size={16} aria-hidden="true" /> {t("account.endSession")}
				</Button>
			)}
		</li>
	);
}
