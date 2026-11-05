import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import {
	ChannelPicker,
	FieldGroup,
	postableChannels,
	SavingIndicator,
	savingStateOf,
	SettingRows,
	Toggle,
	Warning,
} from "@/components/form";
import { PageHeader, Skeleton, Summary } from "@/components/primitives";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels } from "@/features/levelling/useLevelling";
import { SendTest } from "@/features/test-post/SendTest";
import { GoodbyeSettings } from "@/features/welcome/components/GoodbyeSettings";
import { GreetingPreview } from "@/features/welcome/components/GreetingPreview";
import { MessageEditor } from "@/features/welcome/components/MessageEditor";
import { StyleChoice } from "@/features/welcome/components/StyleChoice";
import { useGoodbye } from "@/features/welcome/useGoodbye";
import { useUpdateWelcome, useWelcome } from "@/features/welcome/useWelcome";
import { STYLE_ORDER, welcomeSummary } from "@/features/welcome/welcome.utils";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { channelLabel } from "@/lib/channels";

export function WelcomePage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();

	const config = useWelcome(guildId);
	const goodbye = useGoodbye(guildId);
	const channels = useChannels(guildId);
	const overview = useGuildOverview(guildId);
	const update = useUpdateWelcome(guildId);

	usePageTitle(t("welcome.title"), overview.data?.name);

	const [draft, setDraft] = useState("");

	useEffect(() => {
		if (config.data !== undefined) setDraft(config.data.message);
	}, [config.data?.message]);

	if (config.isPending) return <Skeleton className="h-96 w-full" />;
	if (config.isError) return <ErrorState error={config.error} onRetry={() => void config.refetch()} />;

	const welcome = config.data;
	// The stored record requires a channel, so the API refuses every write except "off" until there is one.
	const needsChannel = welcome.channelId === null;
	const postable = postableChannels(channels.data ?? []);
	const guildName = overview.data?.name ?? t("welcome.thisServer");
	const memberCount = overview.data?.memberCount ?? 0;

	return (
		<>
			<PageHeader server={overview.data} title={t("welcome.title")} subtitle={t("welcome.subtitle")} />

			<Summary>
				{welcomeSummary(
					welcome,
					channelLabel(postable, welcome.channelId, t),
					goodbye.data,
					channelLabel(postable, goodbye.data?.channelId ?? null, t),
					t,
				)}
			</Summary>

			<SettingRows
				title={t("welcome.greeting")}
				action={<SavingIndicator state={savingStateOf(update.isPending, update.isSuccess)} />}
			>
				<ChannelPicker
					label={t("welcome.sendTo")}
					hint={t("welcome.sendToHint")}
					channels={channels.data ?? []}
					value={welcome.channelId}
					allowNone={false}
					onChange={(channelId) => {
						update.mutate({ channelId });
					}}
				/>

				<Toggle
					label={t("welcome.greet")}
					hint={needsChannel ? t("welcome.pickFirst") : t("welcome.greetHint")}
					checked={welcome.enabled}
					disabled={needsChannel}
					onChange={(enabled) => {
						update.mutate({ enabled });
					}}
				/>

				<FieldGroup label={t("welcome.sentAs")}>
					{STYLE_ORDER.map((style) => (
						<StyleChoice
							key={style}
							group="welcome-style"
							style={style}
							checked={welcome.style === style}
							disabled={needsChannel}
							onChange={() => {
								update.mutate({ style });
							}}
						/>
					))}
				</FieldGroup>

				<MessageEditor
					id="welcome-message"
					label={t("welcome.message")}
					saveLabel={t("welcome.saveMessage")}
					draft={draft}
					saved={welcome.message}
					disabled={needsChannel}
					onDraft={setDraft}
					onSave={(message) => {
						update.mutate({ message });
					}}
				>
					<GreetingPreview message={draft} style={welcome.style} guildName={guildName} memberCount={memberCount} />
					<SendTest test={{ kind: "greeting", message: draft, style: welcome.style }} />
				</MessageEditor>

				{update.error !== null && (
					<Warning>{update.error instanceof ApiError ? update.error.message : t("common.couldNotSave")}</Warning>
				)}
			</SettingRows>

			<GoodbyeSettings
				guildId={guildId}
				channels={channels.data ?? []}
				guildName={guildName}
				memberCount={memberCount}
			/>
		</>
	);
}
