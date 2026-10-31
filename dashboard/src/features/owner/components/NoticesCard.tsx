import {
	isScheduled,
	type Notice,
	NOTICE_LIMITS,
	NOTICE_TONES,
	noticeInput,
	type NoticeInput,
	type NoticeTone,
} from "@testify/shared";
import { BellRing, Pencil, Send, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/app/ErrorState";
import { Field, FIELD, LABEL, SELECT, Warning } from "@/components/form";
import { Badge, Button, Card, CARD_HEADING, DividedList, SegmentedControl, Skeleton } from "@/components/primitives";
import { NOTICE_TONE_BADGES, NOTICE_TONE_LABELS } from "@/features/notices/notices.utils";
import {
	type TimingChange,
	timingChange,
	timingDraftOf,
	UP_FOR_HOURS,
	type UpFor,
	upForLabel,
} from "@/features/owner/noticeTiming.utils";
import { useChangeNotice, useOwnerNotices, usePostNotice, useRemoveNotice } from "@/features/owner/useControl";
import { toLocalInput } from "@/features/scheduled-messages/scheduledMessages.utils";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { dateAndTime } from "@/lib/datetime";
import { problemText } from "@/lib/problemText";
import { sanitiseInput } from "@/lib/sanitise";

type Words = Pick<NoticeInput, "title" | "body" | "tone">;

const EMPTY: Words = { title: "", body: "", tone: "info" };

/** The same form posts a new one and changes one; `notice` is the one being changed, or null. */
function NoticeForm({
	notice,
	submitLabel,
	busy,
	disabled = false,
	onSubmit,
	onCancel,
}: {
	notice: Notice | null;
	submitLabel: string;
	busy: boolean;
	disabled?: boolean;
	onSubmit: (input: Words & TimingChange, done: () => void) => void;
	onCancel?: () => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const id = useId();
	const [draft, setDraft] = useState<Words>(
		notice === null ? EMPTY : { title: notice.title, body: notice.body, tone: notice.tone },
	);
	const [timing, setTiming] = useState(() => timingDraftOf(notice, new Date()));
	const now = new Date();
	const valid = noticeInput.safeParse(draft).success;
	const { change, problem } = timingChange(timing, notice, now);
	const waiting = notice === null ? timing.start === "later" : isScheduled(notice, now);
	const keptEnd = notice?.endsAt ?? null;

	return (
		<div className="flex flex-col gap-3">
			<Field label={t("owner.noticeTitle")} htmlFor={`${id}-title`}>
				<input
					id={`${id}-title`}
					value={draft.title}
					maxLength={NOTICE_LIMITS.maxTitle}
					placeholder={t("owner.noticeTitlePlaceholder")}
					onChange={(event) => {
						setDraft({ ...draft, title: event.target.value });
					}}
					className={FIELD}
				/>
			</Field>
			<Field label={t("owner.noticeBody")} htmlFor={`${id}-body`} hint={t("owner.noticeBodyHint")}>
				<textarea
					id={`${id}-body`}
					rows={3}
					value={draft.body}
					maxLength={NOTICE_LIMITS.maxBody}
					placeholder={t("owner.noticeBodyPlaceholder")}
					onChange={(event) => {
						setDraft({ ...draft, body: event.target.value });
					}}
					className={cn(FIELD, "resize-y")}
				/>
			</Field>
			<SegmentedControl
				label={t("owner.noticeKind")}
				segments={NOTICE_TONES.map((tone) => ({ value: tone, label: t(NOTICE_TONE_LABELS[tone]) }))}
				value={draft.tone}
				onChange={(tone: NoticeTone) => {
					setDraft({ ...draft, tone });
				}}
			/>

			{notice === null && (
				<div className="flex flex-col gap-2">
					<span className={LABEL}>{t("owner.noticeStart")}</span>
					<SegmentedControl
						label={t("owner.noticeStart")}
						className="self-start"
						segments={[
							{ value: "now", label: t("owner.noticeStartNow") },
							{ value: "later", label: t("owner.noticeStartLater") },
						]}
						value={timing.start}
						onChange={(start: "now" | "later") => {
							setTiming({ ...timing, start });
						}}
					/>
				</div>
			)}

			<div className="grid gap-3 sm:grid-cols-2">
				{waiting && (
					<Field label={t("owner.noticeStartAt")} htmlFor={`${id}-start`} hint={t("owner.noticeStartAtHint")}>
						<input
							id={`${id}-start`}
							type="datetime-local"
							value={timing.localTime}
							min={toLocalInput(new Date(now.getTime() + NOTICE_LIMITS.minAheadMinutes * 60_000))}
							onChange={(event) => {
								setTiming({ ...timing, localTime: event.target.value });
							}}
							className={FIELD}
						/>
					</Field>
				)}
				<Field
					label={t("owner.noticeUpFor")}
					htmlFor={`${id}-up-for`}
					hint={waiting || notice === null ? t("owner.noticeUpForHint") : t("owner.noticeUpForHintNow")}
				>
					<select
						id={`${id}-up-for`}
						value={String(timing.upFor)}
						onChange={(event) => {
							const value = event.target.value;
							const upFor: UpFor = value === "keep" || value === "forever" ? value : (Number(value) as UpFor);
							setTiming({ ...timing, upFor });
						}}
						className={SELECT}
					>
						{keptEnd !== null && (
							<option value="keep">{t("owner.noticeKeepEnd", { when: dateAndTime(keptEnd) })}</option>
						)}
						<option value="forever">{t("owner.noticeUpForever")}</option>
						{UP_FOR_HOURS.map((hours) => (
							<option key={hours} value={hours}>
								{upForLabel(hours, t)}
							</option>
						))}
					</select>
				</Field>
			</div>

			{problem !== null && <Warning>{problemText(problem, t)}</Warning>}

			<div className="flex flex-wrap gap-2">
				<Button
					disabled={!valid || problem !== null || busy || disabled}
					onClick={() => {
						const words = { title: sanitiseInput(draft.title), body: sanitiseInput(draft.body), tone: draft.tone };
						onSubmit({ ...words, ...change }, () => {
							setDraft(EMPTY);
							setTiming(timingDraftOf(null, new Date()));
						});
					}}
				>
					{submitLabel}
				</Button>
				{onCancel !== undefined && (
					<Button variant="ghost" onClick={onCancel}>
						{t("common.cancel")}
					</Button>
				)}
			</div>
		</div>
	);
}

function NoticeRow({ notice }: { notice: Notice }): React.JSX.Element {
	const { t } = useTranslation();
	const change = useChangeNotice();
	const remove = useRemoveNotice();
	const [editing, setEditing] = useState(false);
	const [confirming, setConfirming] = useState(false);
	const busy = change.isPending || remove.isPending;
	const failure = change.error ?? remove.error;
	const waiting = isScheduled(notice, new Date());

	return (
		<li className="flex flex-col gap-3 px-6 py-4">
			{editing ? (
				<NoticeForm
					notice={notice}
					submitLabel={t("owner.noticeSave")}
					busy={busy}
					onSubmit={(patch) => {
						change.mutate(
							{ id: notice.id, patch },
							{
								onSuccess: () => {
									setEditing(false);
								},
							},
						);
					}}
					onCancel={() => {
						setEditing(false);
					}}
				/>
			) : (
				<>
					<div className="flex flex-wrap items-center gap-2">
						<Badge tone={NOTICE_TONE_BADGES[notice.tone]}>{t(NOTICE_TONE_LABELS[notice.tone])}</Badge>
						{waiting && <Badge>{t("owner.noticeScheduled")}</Badge>}
						<h3 className="text-sm font-medium">{notice.title}</h3>
					</div>
					<p className="text-muted-foreground text-sm whitespace-pre-line">{notice.body}</p>
					<p className="text-muted-foreground text-xs">
						{waiting
							? t("owner.noticeGoesUp", { when: dateAndTime(notice.publishedAt) })
							: t("notices.posted", { when: dateAndTime(notice.publishedAt) })}
						{notice.endsAt !== null && ` · ${t("owner.noticeComesDown", { when: dateAndTime(notice.endsAt) })}`}
					</p>

					{confirming ? (
						<div className="flex flex-wrap items-center gap-2">
							<p className="text-sm">{t("owner.noticeRemoveConfirm")}</p>
							<Button
								variant="destructive"
								disabled={busy}
								onClick={() => {
									remove.mutate(notice.id);
								}}
							>
								{t("owner.noticeRemoveIt")}
							</Button>
							<Button
								variant="ghost"
								onClick={() => {
									setConfirming(false);
								}}
							>
								{t("owner.noticeKeep")}
							</Button>
						</div>
					) : (
						<div className="flex flex-wrap gap-2">
							<Button
								variant="secondary"
								onClick={() => {
									setEditing(true);
								}}
							>
								<Pencil size={15} aria-hidden="true" /> {t("owner.noticeEdit")}
							</Button>
							<Button
								variant="secondary"
								disabled={busy}
								onClick={() => {
									change.mutate({ id: notice.id, patch: { notifyAgain: true } });
								}}
							>
								{waiting ? <Send size={15} aria-hidden="true" /> : <BellRing size={15} aria-hidden="true" />}{" "}
								{waiting ? t("owner.noticePostNow") : t("owner.noticeAgain")}
							</Button>
							<Button
								variant="ghost"
								onClick={() => {
									setConfirming(true);
								}}
							>
								<Trash2 size={15} aria-hidden="true" /> {t("owner.noticeRemove")}
							</Button>
						</div>
					)}
				</>
			)}

			{failure !== null && <Warning>{failure instanceof ApiError ? failure.message : t("common.didNotWork")}</Warning>}
		</li>
	);
}

/** Its own read, so a failure here leaves the rest of the tab working. */
export function NoticesCard(): React.JSX.Element {
	const { t } = useTranslation();
	const notices = useOwnerNotices();
	const post = usePostNotice();
	const full = (notices.data?.length ?? 0) >= NOTICE_LIMITS.maxActive;

	return (
		<Card className="flex flex-col gap-4">
			<div>
				<h2 className={CARD_HEADING}>{t("owner.notices")}</h2>
				<p className="text-muted-foreground text-sm">{t("owner.noticesBody")}</p>
			</div>

			{notices.isPending ? (
				<Skeleton className="h-24 w-full" />
			) : notices.data === undefined ? (
				<ErrorState as="h2" error={notices.error} onRetry={() => void notices.refetch()} />
			) : (
				<>
					{notices.data.length === 0 ? (
						<p className="text-sm">{t("owner.noticesNone")}</p>
					) : (
						<DividedList>
							{notices.data.map((notice) => (
								<NoticeRow key={notice.id} notice={notice} />
							))}
						</DividedList>
					)}

					<h3 className="text-sm font-medium">{t("owner.postNotice")}</h3>
					{full && <Warning>{t("owner.noticesFull", { max: NOTICE_LIMITS.maxActive })}</Warning>}
					<NoticeForm
						notice={null}
						submitLabel={t("owner.postNotice")}
						busy={post.isPending}
						disabled={full}
						onSubmit={(input, done) => {
							post.mutate(input, { onSuccess: done });
						}}
					/>
					{post.error !== null && (
						<Warning>{post.error instanceof ApiError ? post.error.message : t("common.didNotWork")}</Warning>
					)}
				</>
			)}
		</Card>
	);
}
