import { ANNOUNCEMENT_LIMITS, ANNOUNCEMENT_MENTIONS, ANNOUNCEMENT_STYLES, EMBED_COLOURS } from "@testify/shared";
import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import {
	ChannelPicker,
	Field,
	FIELD,
	FieldGroup,
	postableChannels,
	RadioCard,
	RowActions,
	SELECT,
	SettingRows,
	Warning,
} from "@/components/form";
import { Button, DiscordPreview, PageHeader, Summary } from "@/components/primitives";
import { COLOUR_LABELS } from "@/features/announcements/announcements.labels";
import {
	type AnnouncementDraft,
	announcementSummary,
	bodyOf,
	draftProblem,
	EMPTY_DRAFT,
	MENTION_LABELS,
	STYLE_LABELS,
	testOf,
} from "@/features/announcements/announcements.utils";
import { usePostAnnouncement } from "@/features/announcements/useAnnouncements";
import { useBotLook } from "@/features/auth/useBot";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels } from "@/features/levelling/useLevelling";
import { SendTest } from "@/features/test-post/SendTest";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { BUILT_IN_BOT_NAME } from "@/lib/brand";
import { channelLabel } from "@/lib/channels";
import { cn } from "@/lib/cn";
import { markupWarning } from "@/lib/sanitise";

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
	const postable = postableChannels(channels.data ?? []);
	const markup = markupWarning(draft.message);

	return (
		<>
			<PageHeader server={overview.data} title={t("announcements.title")} subtitle={t("announcements.subtitle")} />

			<Summary>{announcementSummary(draft, channelLabel(postable, draft.channelId, t), t)}</Summary>

			<SettingRows>
				<ChannelPicker
					label={t("announcements.channel")}
					channels={postable}
					value={draft.channelId}
					allowNone={false}
					onChange={(channelId) => {
						change({ channelId });
					}}
				/>

				<FieldGroup label={t("announcements.style")}>
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
				</FieldGroup>

				{draft.style === "embed" && (
					<Field label={t("announcements.titleLabel")} hint={t("announcements.titleHint")} htmlFor="announcement-title">
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
				)}
				{draft.style === "embed" && (
					<Field label={t("announcements.colour")} htmlFor="announcement-colour">
						<select
							id="announcement-colour"
							className={cn(SELECT, "max-w-56")}
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
					{markup !== null && <Warning>{markup}</Warning>}
				</Field>

				<FieldGroup label={t("announcements.ping")}>
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
				</FieldGroup>

				<FieldGroup label={t("common.preview")} hint={t("announcements.previewNote")}>
					<Preview draft={draft} />
					<SendTest test={testOf(draft)} />
				</FieldGroup>

				<RowActions>
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
				</RowActions>
				{post.error !== null && (
					<Warning>{post.error instanceof ApiError ? post.error.message : t("common.couldNotSave")}</Warning>
				)}
			</SettingRows>
		</>
	);
}

function Preview({ draft }: { draft: AnnouncementDraft }): React.JSX.Element {
	const { t } = useTranslation();
	const bot = useBotLook();
	const ping = draft.mentions === "none" ? null : `@${draft.mentions}`;
	const message = draft.message.trim() === "" ? t("common.previewEmpty") : draft.message;

	return (
		<DiscordPreview name={bot.name ?? BUILT_IN_BOT_NAME} avatarUrl={bot.avatarUrl}>
			<div className="mt-1 flex flex-col gap-2">
				{ping !== null && (
					<span className="bg-accent-wash text-accent w-fit rounded-chip px-1.5 text-sm font-medium">{ping}</span>
				)}
				{draft.style === "embed" ? (
					<div
						className="border-border bg-card rounded-field border border-l-4 p-3"
						style={{ borderLeftColor: draft.colour }}
					>
						<p className="text-sm font-semibold break-words">
							{draft.title.trim() === "" ? t("announcements.defaultTitle") : draft.title}
						</p>
						<p className="text-sm break-words whitespace-pre-wrap">{message}</p>
					</div>
				) : (
					<p className="text-sm break-words whitespace-pre-wrap">{message}</p>
				)}
			</div>
		</DiscordPreview>
	);
}
