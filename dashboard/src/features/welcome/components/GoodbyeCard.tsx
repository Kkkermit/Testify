import { type ChannelSummary, GOODBYE_STYLES } from "@testify/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/app/ErrorState";
import { ChannelPicker, LABEL, SavingIndicator, savingStateOf, Toggle, Warning } from "@/components/form";
import { cardClass, Eyebrow, Skeleton } from "@/components/primitives";
import { GreetingPreview } from "@/features/welcome/components/GreetingPreview";
import { MessageEditor } from "@/features/welcome/components/MessageEditor";
import { StyleChoice } from "@/features/welcome/components/StyleChoice";
import { useGoodbye, useUpdateGoodbye } from "@/features/welcome/useGoodbye";
import { ApiError } from "@/lib/api";

/** Reads on its own, so a failing goodbye leaves the greeting above it working. */
export function GoodbyeCard({
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

	const goodbye = config.data;
	// The bot refuses to switch goodbyes on with nowhere to post them.
	const needsChannel = goodbye.channelId === null;

	return (
		<section aria-labelledby="goodbye-heading" className={cardClass("default", "motion-pop flex flex-col gap-4")}>
			<div className="flex items-center justify-between gap-3">
				<Eyebrow as="h2" id="goodbye-heading">
					{t("goodbye.heading")}
				</Eyebrow>
				<SavingIndicator state={savingStateOf(update.isPending, update.isSuccess)} />
			</div>

			<ChannelPicker
				label={t("goodbye.sendTo")}
				channels={channels}
				value={goodbye.channelId}
				allowNone={false}
				onChange={(channelId) => {
					update.mutate({ channelId });
				}}
			/>

			{needsChannel && <Warning>{t("goodbye.pickFirst")}</Warning>}
			{!needsChannel && !goodbye.canSend && <Warning>{t("goodbye.cannotSend")}</Warning>}

			<Toggle
				label={t("goodbye.say")}
				hint={t("goodbye.sayHint")}
				checked={goodbye.enabled}
				disabled={needsChannel}
				onChange={(enabled) => {
					update.mutate({ enabled });
				}}
			/>

			<fieldset disabled={needsChannel}>
				<legend className={LABEL}>{t("welcome.sentAs")}</legend>
				<div className="mt-2 grid gap-2 sm:grid-cols-2">
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
				</div>
			</fieldset>

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
			/>
			<p className="text-muted-foreground text-xs">{t("goodbye.mentionNote")}</p>

			{update.error !== null && (
				<Warning>{update.error instanceof ApiError ? update.error.message : t("common.couldNotSave")}</Warning>
			)}

			<div className="flex flex-col gap-3">
				<Eyebrow as="h3">{t("welcome.preview")}</Eyebrow>
				<GreetingPreview
					message={draft}
					style={goodbye.style}
					guildName={guildName}
					memberCount={memberCount}
					leaving
				/>
			</div>
		</section>
	);
}
