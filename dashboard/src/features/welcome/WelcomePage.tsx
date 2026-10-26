import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { ChannelPicker, LABEL, SavingIndicator, savingStateOf, Toggle, Warning } from "@/components/form";
import { cardClass, Eyebrow, PageHeader, Skeleton } from "@/components/primitives";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels } from "@/features/levelling/useLevelling";
import { GoodbyeCard } from "@/features/welcome/components/GoodbyeCard";
import { GreetingPreview } from "@/features/welcome/components/GreetingPreview";
import { MessageEditor } from "@/features/welcome/components/MessageEditor";
import { StyleChoice } from "@/features/welcome/components/StyleChoice";
import { useUpdateWelcome, useWelcome } from "@/features/welcome/useWelcome";
import { STYLE_ORDER } from "@/features/welcome/welcome.utils";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";

export function WelcomePage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();

	const config = useWelcome(guildId);
	const channels = useChannels(guildId);
	const overview = useGuildOverview(guildId);
	const update = useUpdateWelcome(guildId);

	usePageTitle(t("welcome.title"), overview.data?.name);

	const [draft, setDraft] = useState("");

	// The template is the one field that is edited rather than toggled, so it is held locally and saved on blur.
	useEffect(() => {
		if (config.data !== undefined) setDraft(config.data.message);
	}, [config.data?.message]);

	if (config.isPending) return <Skeleton className="h-96 w-full" />;
	if (config.isError) return <ErrorState error={config.error} onRetry={() => void config.refetch()} />;

	const welcome = config.data;
	// The stored record requires a channel, so the API refuses every write except "off" until there is one.
	const needsChannel = welcome.channelId === null;

	return (
		<>
			<PageHeader eyebrow={overview.data?.name} title={t("welcome.title")} subtitle={t("welcome.subtitle")} />

			<section aria-labelledby="greeting-heading" className={cardClass("default", "motion-pop flex flex-col gap-4")}>
				<div className="flex items-center justify-between gap-3">
					<Eyebrow as="h2" id="greeting-heading">
						{t("welcome.greeting")}
					</Eyebrow>
					<SavingIndicator state={savingStateOf(update.isPending, update.isSuccess)} />
				</div>

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

				{needsChannel && <Warning>{t("welcome.pickFirst")}</Warning>}

				<Toggle
					label={t("welcome.greet")}
					hint={t("welcome.greetHint")}
					checked={welcome.enabled}
					disabled={needsChannel}
					onChange={(enabled) => {
						update.mutate({ enabled });
					}}
				/>

				{/* A `<legend>` is not a flex item, so the gap under it has to be a margin on the group itself. */}
				<fieldset disabled={needsChannel}>
					<legend className={LABEL}>{t("welcome.sentAs")}</legend>
					<div className="mt-2 grid gap-2 sm:grid-cols-3">
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
					</div>
				</fieldset>

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
				/>

				{update.error !== null && (
					<Warning>{update.error instanceof ApiError ? update.error.message : t("common.couldNotSave")}</Warning>
				)}
			</section>

			<section aria-labelledby="preview-heading" className="flex flex-col gap-3">
				<Eyebrow as="h2" id="preview-heading">
					{t("welcome.preview")}
				</Eyebrow>
				<GreetingPreview
					message={draft}
					style={welcome.style}
					guildName={overview.data?.name ?? t("welcome.thisServer")}
					memberCount={overview.data?.memberCount ?? 0}
				/>
			</section>

			<GoodbyeCard
				guildId={guildId}
				channels={channels.data ?? []}
				guildName={overview.data?.name ?? t("welcome.thisServer")}
				memberCount={overview.data?.memberCount ?? 0}
			/>
		</>
	);
}
