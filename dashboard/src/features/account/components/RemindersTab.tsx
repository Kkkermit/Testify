import { type AccountReminder } from "@testify/shared";
import { AlarmClock, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/app/ErrorState";
import { useUndo } from "@/app/undo";
import { Toggle, Warning } from "@/components/form";
import { Button, Card, DividedList, EmptyState, Skeleton, Summary } from "@/components/primitives";
import { useAccountReminders, useCancelReminder, useReminderRoute } from "@/features/account/useAccount";
import { ahead, dateAndTime } from "@/lib/datetime";

const keyOf = (id: string): string => `reminder:${id}`;

export function RemindersTab(): React.JSX.Element {
	const { t } = useTranslation();
	const reminders = useAccountReminders();
	const route = useReminderRoute();
	const cancel = useCancelReminder();
	const undo = useUndo();

	if (reminders.isError) return <ErrorState as="h2" error={reminders.error} onRetry={() => void reminders.refetch()} />;
	if (reminders.isPending) return <Skeleton className="h-48 w-full" />;

	const shown = reminders.data.filter((reminder) => !undo.isHidden(keyOf(reminder.id)));

	return (
		<>
			<Summary>{t("account.remindersSummary", { count: shown.length })}</Summary>
			{route.error !== null && <Warning>{t("account.reminderRouteFailed")}</Warning>}

			{shown.length === 0 ? (
				<EmptyState
					icon={<AlarmClock size={28} />}
					title={t("account.remindersNone")}
					body={t("account.remindersNoneBody")}
				/>
			) : (
				<Card padding="none">
					<DividedList className="rounded-card border-0">
						{shown.map((reminder) => (
							<ReminderRow
								key={reminder.id}
								reminder={reminder}
								busy={route.isPending && route.variables.id === reminder.id}
								onRoute={(deliver) => {
									route.mutate({ id: reminder.id, deliver });
								}}
								onCancel={() => {
									undo.schedule({
										key: keyOf(reminder.id),
										label: t("undo.reminder", { text: reminder.text }),
										commit: () => cancel.mutateAsync(reminder.id),
									});
								}}
							/>
						))}
					</DividedList>
				</Card>
			)}
		</>
	);
}

function ReminderRow({
	reminder,
	busy,
	onRoute,
	onCancel,
}: {
	reminder: AccountReminder;
	busy: boolean;
	onRoute: (deliver: AccountReminder["deliver"]) => void;
	onCancel: () => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const where =
		reminder.guildId === null
			? t("account.reminderSetInDm")
			: t("account.reminderSetIn", { server: reminder.guildName ?? t("account.leftServer") });

	return (
		<li className="flex flex-col gap-3 px-6 py-4">
			<div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
				<div className="flex min-w-0 grow basis-64 flex-col gap-1">
					<p className="text-sm font-medium break-words whitespace-pre-line">{reminder.text}</p>
					<p className="text-muted-foreground text-xs">
						<time dateTime={reminder.dueAt} className="tabular-nums">
							{t("account.reminderDue", {
								when: dateAndTime(reminder.dueAt),
								from: ahead(Math.max(0, Date.parse(reminder.dueAt) - Date.now())),
							})}
						</time>
						{" · "}
						{where}
					</p>
				</div>
				<Button
					variant="ghost"
					onClick={onCancel}
					aria-label={t("account.reminderCancelLabel", { text: reminder.text })}
				>
					<X size={16} aria-hidden="true" /> {t("account.reminderCancel")}
				</Button>
			</div>
			{reminder.canPing && (
				<Toggle
					label={t("account.reminderByDm")}
					hint={t("account.reminderByDmHint")}
					checked={reminder.deliver === "dm"}
					disabled={busy}
					onChange={(byDm) => {
						onRoute(byDm ? "dm" : "channel");
					}}
				/>
			)}
		</li>
	);
}
