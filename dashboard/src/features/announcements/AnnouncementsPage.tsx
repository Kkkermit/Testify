import { ANNOUNCEMENT_LIMITS, ANNOUNCEMENT_MENTIONS, ANNOUNCEMENT_STYLES, EMBED_COLOURS } from "@testify/shared";
import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ChannelPicker, Field, FIELD, postableChannels, RadioCard, SELECT, Warning } from "@/components/form";
import { Button, Card, CARD_HEADING, Eyebrow, PageHeader } from "@/components/primitives";
import { COLOUR_LABELS } from "@/features/announcements/announcements.labels";
import {
	type AnnouncementDraft,
	bodyOf,
	draftProblem,
	EMPTY_DRAFT,
	MENTION_LABELS,
	STYLE_LABELS,
} from "@/features/announcements/announcements.utils";
import { usePostAnnouncement } from "@/features/announcements/useAnnouncements";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels } from "@/features/levelling/useLevelling";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { markupWarning } from "@/lib/sanitise";

/** A message posted as the bot, with a live preview, and nobody pinged unless that is chosen on purpose. */
export function AnnouncementsPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();
	const overview = useGuildOverview(guildId);
	const channels = useChannels(guildId);
	const post = usePostAnnouncement(guildId);
	const [draft, setDraft] = useState<AnnouncementDraft>(EMPTY_DRAFT);

	usePageTitle(t("announcements.title"), overview.data?.name);

	const change = (patch: Partial<AnnouncementDraft>): void => {
		setDraft((current) => ({ ...current, ...patch }));
		post.reset();
	};
	const problem = draftProblem(draft);
	const markup = markupWarning(draft.message);

	return (
		<>
			<PageHeader
				eyebrow={overview.data?.name}
				title={t("announcements.title")}
				subtitle={t("announcements.subtitle")}
			/>

			<div className="grid gap-6 lg:grid-cols-2 lg:items-start">
				<Card className="flex flex-col gap-4">
					<h2 className={CARD_HEADING}>{t("announcements.compose")}</h2>

					<ChannelPicker
						label={t("announcements.channel")}
						channels={postableChannels(channels.data ?? [])}
						value={draft.channelId}
						allowNone={false}
						onChange={(channelId) => {
							change({ channelId });
						}}
					/>

					<fieldset className="flex flex-col gap-2">
						<legend className="mb-2 text-sm font-medium">{t("announcements.style")}</legend>
						<div className="grid gap-2 sm:grid-cols-2">
							{ANNOUNCEMENT_STYLES.map((style) => (
								<RadioCard
									key={style}
									name="announcement-style"
									label={t(STYLE_LABELS[style].label)}
									description={t(STYLE_LABELS[style].describes)}
									checked={draft.style === style}
									onChange={() => {
										change({ style });
									}}
								/>
							))}
						</div>
					</fieldset>

					{draft.style === "embed" && (
						<div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
							<Field
								label={t("announcements.titleLabel")}
								hint={t("announcements.titleHint")}
								htmlFor="announcement-title"
							>
								<input
									id="announcement-title"
									className={FIELD}
									value={draft.title}
									maxLength={ANNOUNCEMENT_LIMITS.maxTitle}
									onChange={(event) => {
										change({ title: event.target.value });
									}}
								/>
							</Field>
							<Field label={t("announcements.colour")} htmlFor="announcement-colour">
								<select
									id="announcement-colour"
									className={SELECT}
									value={draft.colour}
									onChange={(event) => {
										const colour = EMBED_COLOURS.find((entry) => entry.value === event.target.value);
										if (colour !== undefined) change({ colour: colour.value });
									}}
								>
									{EMBED_COLOURS.map((colour) => (
										<option key={colour.value} value={colour.value}>
											{t(COLOUR_LABELS[colour.value])}
										</option>
									))}
								</select>
							</Field>
						</div>
					)}

					<Field label={t("announcements.message")} htmlFor="announcement-message">
						<textarea
							id="announcement-message"
							rows={6}
							className={cn(
								FIELD,
								"resize-y",
								draft.message.length > ANNOUNCEMENT_LIMITS.maxMessage && "border-destructive",
							)}
							value={draft.message}
							onChange={(event) => {
								change({ message: event.target.value });
							}}
						/>
						<span className="text-muted-foreground text-xs tabular-nums" aria-live="polite">
							{t("announcements.counter", { count: draft.message.length, max: ANNOUNCEMENT_LIMITS.maxMessage })}
						</span>
					</Field>
					{markup !== null && <Warning>{markup}</Warning>}

					<fieldset className="flex flex-col gap-2">
						<legend className="mb-2 text-sm font-medium">{t("announcements.ping")}</legend>
						<div className="grid gap-2 sm:grid-cols-3">
							{ANNOUNCEMENT_MENTIONS.map((mentions) => (
								<RadioCard
									key={mentions}
									name="announcement-mentions"
									label={t(MENTION_LABELS[mentions].label)}
									description={t(MENTION_LABELS[mentions].describes)}
									checked={draft.mentions === mentions}
									onChange={() => {
										change({ mentions });
									}}
								/>
							))}
						</div>
					</fieldset>

					<div className="flex flex-wrap items-center gap-3">
						<Button
							disabled={problem !== null || post.isPending}
							onClick={() => {
								if (draft.channelId === null) return;
								post.mutate(bodyOf({ ...draft, channelId: draft.channelId }), {
									onSuccess: () => {
										setDraft((current) => ({ ...EMPTY_DRAFT, channelId: current.channelId }));
									},
								});
							}}
						>
							{t("announcements.post")}
						</Button>
						{problem !== null && <span className="text-muted-foreground text-sm">{t(problem)}</span>}
					</div>

					{post.isSuccess && (
						<p className="text-success flex flex-wrap items-center gap-2 text-sm" role="status">
							{t("announcements.posted")}
							<a
								href={post.data.url}
								target="_blank"
								rel="noreferrer"
								className="text-foreground inline-flex items-center gap-1 underline underline-offset-2"
							>
								{t("announcements.open")} <ExternalLink size={14} aria-hidden="true" />
							</a>
						</p>
					)}
					{post.error !== null && (
						<Warning>{post.error instanceof ApiError ? post.error.message : t("common.couldNotSave")}</Warning>
					)}
				</Card>

				<Preview draft={draft} />
			</div>
		</>
	);
}

/** Roughly what Discord will draw, so the words and the ping can be checked before they are everybody's. */
function Preview({ draft }: { draft: AnnouncementDraft }): React.JSX.Element {
	const { t } = useTranslation();
	const ping = draft.mentions === "none" ? null : `@${draft.mentions}`;
	const message = draft.message.trim() === "" ? t("announcements.previewEmpty") : draft.message;

	return (
		<section aria-labelledby="announcement-preview" className="flex flex-col gap-3">
			<Eyebrow as="h2" id="announcement-preview">
				{t("announcements.preview")}
			</Eyebrow>
			<Card className="flex flex-col gap-2">
				{ping !== null && (
					<span className="bg-primary/15 text-primary w-fit rounded-chip px-1.5 text-sm font-medium">{ping}</span>
				)}
				{draft.style === "embed" ? (
					<div className="border-border rounded-field border border-l-4 p-3" style={{ borderLeftColor: draft.colour }}>
						<p className="text-sm font-semibold break-words">
							{draft.title.trim() === "" ? t("announcements.defaultTitle") : draft.title}
						</p>
						<p className="text-sm break-words whitespace-pre-wrap">{message}</p>
					</div>
				) : (
					<p className="text-sm break-words whitespace-pre-wrap">{message}</p>
				)}
				<p className="text-muted-foreground text-xs">{t("announcements.previewNote")}</p>
			</Card>
		</section>
	);
}
