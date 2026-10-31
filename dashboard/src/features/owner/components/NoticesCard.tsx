import {
	type Notice,
	NOTICE_LIMITS,
	NOTICE_TONES,
	noticeInput,
	type NoticeInput,
	type NoticeTone,
} from "@testify/shared";
import { BellRing, Pencil, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/app/ErrorState";
import { Field, FIELD, Warning } from "@/components/form";
import { Badge, Button, Card, CARD_HEADING, DividedList, SegmentedControl, Skeleton } from "@/components/primitives";
import { NOTICE_TONE_BADGES, NOTICE_TONE_LABELS } from "@/features/notices/notices.utils";
import { useChangeNotice, useOwnerNotices, usePostNotice, useRemoveNotice } from "@/features/owner/useControl";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { dateAndTime } from "@/lib/datetime";
import { sanitiseInput } from "@/lib/sanitise";

const EMPTY: NoticeInput = { title: "", body: "", tone: "info" };

function NoticeForm({
	initial,
	submitLabel,
	busy,
	disabled = false,
	onSubmit,
	onCancel,
}: {
	initial: NoticeInput;
	submitLabel: string;
	busy: boolean;
	disabled?: boolean;
	onSubmit: (input: NoticeInput, done: () => void) => void;
	onCancel?: () => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const id = useId();
	const [draft, setDraft] = useState(initial);
	const valid = noticeInput.safeParse(draft).success;

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
			<div className="flex flex-wrap gap-2">
				<Button
					disabled={!valid || busy || disabled}
					onClick={() => {
						onSubmit({ title: sanitiseInput(draft.title), body: sanitiseInput(draft.body), tone: draft.tone }, () => {
							setDraft(EMPTY);
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

	return (
		<li className="flex flex-col gap-3 px-6 py-4">
			{editing ? (
				<NoticeForm
					initial={{ title: notice.title, body: notice.body, tone: notice.tone }}
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
						<h3 className="text-sm font-medium">{notice.title}</h3>
					</div>
					<p className="text-muted-foreground text-sm whitespace-pre-line">{notice.body}</p>
					<p className="text-muted-foreground text-xs">
						{t("notices.posted", { when: dateAndTime(notice.publishedAt) })}
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
								<BellRing size={15} aria-hidden="true" /> {t("owner.noticeAgain")}
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
						initial={EMPTY}
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
