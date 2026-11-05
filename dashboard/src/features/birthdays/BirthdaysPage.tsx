import { BIRTHDAY_LIMITS, BIRTHDAY_PLACEHOLDERS } from "@testify/shared";
import { Cake } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import {
	ChannelPicker,
	postableChannels,
	SavingIndicator,
	savingStateOf,
	SettingRows,
	Toggle,
	Warning,
} from "@/components/form";
import { Card, EmptyState, PageHeader, SectionHeading, Skeleton, Summary } from "@/components/primitives";
import { birthdaySummary } from "@/features/birthdays/birthdays.utils";
import { useBirthdays, useUpdateBirthdays } from "@/features/birthdays/useBirthdays";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels } from "@/features/levelling/useLevelling";
import { SendTest } from "@/features/test-post/SendTest";
import { GreetingPreview } from "@/features/welcome/components/GreetingPreview";
import { MessageEditor } from "@/features/welcome/components/MessageEditor";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { channelLabel } from "@/lib/channels";
import { monthName } from "@/lib/datetime";

export function BirthdaysPage(): React.JSX.Element {
	const { t } = useTranslation();
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
	const channel = channelLabel(postableChannels(channels.data ?? []), birthdays.channelId, t);

	return (
		<>
			<PageHeader
				server={overview.data}
				title={t("birthdays.title")}
				subtitle={t("birthdays.subtitle")}
				action={<SavingIndicator state={savingStateOf(update.isPending, update.isSuccess)} />}
			/>

			<Summary>{birthdaySummary(birthdays, channel, t)}</Summary>
			{!needsChannel && !birthdays.canSend && <Warning>{t("birthdays.cannotSend")}</Warning>}

			<SettingRows>
				<ChannelPicker
					label={t("birthdays.channel")}
					channels={channels.data ?? []}
					value={birthdays.channelId}
					allowNone={false}
					onChange={(channelId) => {
						update.mutate({ channelId });
					}}
				/>

				<Toggle
					label={t("birthdays.post")}
					hint={needsChannel ? t("birthdays.pickFirst") : t("birthdays.postHint")}
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
				>
					<GreetingPreview
						message={draft}
						style="text"
						guildName={overview.data?.name ?? t("welcome.thisServer")}
						memberCount={overview.data?.memberCount ?? 0}
					/>
					<p className="text-muted-foreground text-xs">{t("birthdays.pingNote")}</p>
					<SendTest test={{ kind: "birthday", message: draft }} />
				</MessageEditor>
			</SettingRows>

			{update.error !== null && (
				<Warning>{update.error instanceof ApiError ? update.error.message : t("common.couldNotSave")}</Warning>
			)}

			<section aria-labelledby="upcoming-heading" className="flex flex-col gap-3">
				<SectionHeading as="h2" id="upcoming-heading" count={t("birthdays.sharedCount", { count: birthdays.shared })}>
					{t("birthdays.upcoming")}
				</SectionHeading>

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
											month: monthName(entry.month),
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
