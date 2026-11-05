import { type ChannelSummary, GOODBYE_STYLES, type GoodbyeSettings as Goodbye } from "@testify/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/app/ErrorState";
import {
	ChannelPicker,
	FieldGroup,
	SavingIndicator,
	savingStateOf,
	SettingRows,
	Toggle,
	Warning,
} from "@/components/form";
import { Skeleton } from "@/components/primitives";
import { SendTest } from "@/features/test-post/SendTest";
import { GreetingPreview } from "@/features/welcome/components/GreetingPreview";
import { MessageEditor } from "@/features/welcome/components/MessageEditor";
import { StyleChoice } from "@/features/welcome/components/StyleChoice";
import { useGoodbye, useUpdateGoodbye } from "@/features/welcome/useGoodbye";
import { ApiError } from "@/lib/api";

export function GoodbyeSettings({
	guildId,
	channels,
	guildName,
	memberCount,
}: {
	guildId: string;
	channels: ChannelSummary[];
	guildName: string;
	memberCount: number;
}): React.JSX.Element {
	const { t } = useTranslation();
	const config = useGoodbye(guildId);
	const update = useUpdateGoodbye(guildId);
	const [draft, setDraft] = useState("");

	useEffect(() => {
		if (config.data !== undefined) setDraft(config.data.message);
	}, [config.data?.message]);

	if (config.isError) return <ErrorState as="h2" error={config.error} onRetry={() => void config.refetch()} />;
	if (config.isPending) return <Skeleton className="h-72 w-full" />;

	const goodbye: Goodbye = config.data;
	// The bot refuses to switch goodbyes on with nowhere to post them.
	const needsChannel = goodbye.channelId === null;

	return (
		<SettingRows
			title={t("goodbye.heading")}
			action={<SavingIndicator state={savingStateOf(update.isPending, update.isSuccess)} />}
		>
			<ChannelPicker
				label={t("goodbye.sendTo")}
				channels={channels}
				value={goodbye.channelId}
				allowNone={false}
				onChange={(channelId) => {
					update.mutate({ channelId });
				}}
			/>

			<Toggle
				label={t("goodbye.say")}
				hint={needsChannel ? t("goodbye.pickFirst") : t("goodbye.sayHint")}
				checked={goodbye.enabled}
				disabled={needsChannel}
				onChange={(enabled) => {
					update.mutate({ enabled });
				}}
			/>

			<FieldGroup label={t("welcome.sentAs")}>
				{GOODBYE_STYLES.map((style) => (
					<StyleChoice
						key={style}
						group="goodbye-style"
						style={style}
						checked={goodbye.style === style}
						disabled={needsChannel}
						onChange={() => {
							update.mutate({ style });
						}}
					/>
				))}
			</FieldGroup>

			<MessageEditor
				id="goodbye-message"
				label={t("goodbye.message")}
				saveLabel={t("goodbye.saveMessage")}
				draft={draft}
				saved={goodbye.message}
				disabled={needsChannel}
				onDraft={setDraft}
				onSave={(message) => {
					update.mutate({ message });
				}}
			>
				<GreetingPreview
					message={draft}
					style={goodbye.style}
					guildName={guildName}
					memberCount={memberCount}
					leaving
				/>
				<p className="text-muted-foreground text-xs">{t("goodbye.mentionNote")}</p>
				<SendTest test={{ kind: "goodbye", message: draft, style: goodbye.style }} />
			</MessageEditor>

			{!needsChannel && !goodbye.canSend && <Warning>{t("goodbye.cannotSend")}</Warning>}
			{update.error !== null && (
				<Warning>{update.error instanceof ApiError ? update.error.message : t("common.couldNotSave")}</Warning>
			)}
		</SettingRows>
	);
}
