import { BIRTHDAY_LIMITS, BIRTHDAY_PLACEHOLDERS, MONTHS } from "@testify/shared";
import { Cake } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { ChannelPicker, SavingIndicator, savingStateOf, Toggle, Warning } from "@/components/form";
import { Card, cardClass, EmptyState, Eyebrow, PageHeader, Skeleton } from "@/components/primitives";
import { useBirthdays, useUpdateBirthdays } from "@/features/birthdays/useBirthdays";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels } from "@/features/levelling/useLevelling";
import { MessageEditor } from "@/features/welcome/components/MessageEditor";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";

/** The month is English on Discord, and shown through the browser's own month names here. */
function monthName(month: number, locale: string): string {
	return new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(Date.UTC(2000, month - 1, 1));
}

/** Where and how a server's birthdays are posted, and whose come next. */
export function BirthdaysPage(): React.JSX.Element {
	const { t, i18n } = useTranslation();
	const { guildId = "" } = useParams();

	const config = useBirthdays(guildId);
	const channels = useChannels(guildId);
	const overview = useGuildOverview(guildId);
	const update = useUpdateBirthdays(guildId);

	usePageTitle(t("birthdays.title"), overview.data?.name);

	const [draft, setDraft] = useState("");

	useEffect(() => {
		if (config.data !== undefined) setDraft(config.data.message);
	}, [config.data?.message]);

	if (config.isPending) return <Skeleton className="h-96 w-full" />;
	if (config.isError) return <ErrorState error={config.error} onRetry={() => void config.refetch()} />;

	const birthdays = config.data;
	const needsChannel = birthdays.channelId === null;

	return (
		<>
			<PageHeader eyebrow={overview.data?.name} title={t("birthdays.title")} subtitle={t("birthdays.subtitle")} />

			<section aria-labelledby="posts-heading" className={cardClass("default", "motion-pop flex flex-col gap-4")}>
				<div className="flex items-center justify-between gap-3">
					<Eyebrow as="h2" id="posts-heading">
						{t("birthdays.posts")}
					</Eyebrow>
					<SavingIndicator state={savingStateOf(update.isPending, update.isSuccess)} />
				</div>

				<ChannelPicker
					label={t("birthdays.channel")}
					channels={channels.data ?? []}
					value={birthdays.channelId}
					allowNone={false}
					onChange={(channelId) => {
						update.mutate({ channelId });
					}}
				/>

				{needsChannel && <Warning>{t("birthdays.pickFirst")}</Warning>}
				{!needsChannel && !birthdays.canSend && <Warning>{t("birthdays.cannotSend")}</Warning>}

				<Toggle
					label={t("birthdays.post")}
					hint={t("birthdays.postHint")}
					checked={birthdays.enabled}
					disabled={needsChannel}
					onChange={(enabled) => {
						update.mutate({ enabled });
					}}
				/>

				<MessageEditor
					id="birthday-message"
					label={t("birthdays.message")}
					saveLabel={t("birthdays.saveMessage")}
					draft={draft}
					saved={birthdays.message}
					disabled={needsChannel}
					max={BIRTHDAY_LIMITS.maxMessage}
					tokens={BIRTHDAY_PLACEHOLDERS}
					onDraft={setDraft}
					onSave={(message) => {
						update.mutate({ message });
					}}
				/>
				<p className="text-muted-foreground text-xs">{t("birthdays.pingNote")}</p>

				{update.error !== null && (
					<Warning>{update.error instanceof ApiError ? update.error.message : t("common.couldNotSave")}</Warning>
				)}
			</section>

			<section aria-labelledby="upcoming-heading" className="flex flex-col gap-3">
				<Eyebrow as="h2" id="upcoming-heading" count={t("birthdays.sharedCount", { count: birthdays.shared })}>
					{t("birthdays.upcoming")}
				</Eyebrow>

				{birthdays.upcoming.length === 0 ? (
					<Card>
						<EmptyState icon={<Cake size={28} />} title={t("birthdays.emptyTitle")} body={t("birthdays.emptyBody")} />
					</Card>
				) : (
					<Card padding="none">
						<ul className="divide-border divide-y">
							{birthdays.upcoming.map((entry) => (
								<li key={entry.userId} className="flex items-center justify-between gap-3 px-6 py-3 text-sm">
									<span className="min-w-0 truncate font-medium">{entry.name}</span>
									<span className="text-muted-foreground shrink-0 tabular-nums">
										{t("birthdays.on", {
											day: entry.day,
											month: monthName(entry.month, i18n.language) || MONTHS[entry.month - 1],
										})}
									</span>
								</li>
							))}
						</ul>
					</Card>
				)}
			</section>
		</>
	);
}
