import { type Notice } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Badge, Card, CARD_HEADING } from "@/components/primitives";
import { NOTICE_TONE_BADGES, NOTICE_TONE_LABELS, wasEdited } from "@/features/notices/notices.utils";
import { dateAndTime } from "@/lib/datetime";

/** One notification as everybody reads it; its words are text, never markup. */
export function NoticeCard({ notice, isNew }: { notice: Notice; isNew: boolean }): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<Card className="flex flex-col gap-2">
			<div className="flex flex-wrap items-center gap-2">
				<Badge tone={NOTICE_TONE_BADGES[notice.tone]}>{t(NOTICE_TONE_LABELS[notice.tone])}</Badge>
				{isNew && <Badge tone="success">{t("notices.new")}</Badge>}
			</div>
			<h2 className={CARD_HEADING}>{notice.title}</h2>
			<p className="text-sm whitespace-pre-line">{notice.body}</p>
			<p className="text-muted-foreground text-xs">
				{t("notices.posted", { when: dateAndTime(notice.publishedAt) })}
				{wasEdited(notice) && ` · ${t("notices.edited", { when: dateAndTime(notice.updatedAt) })}`}
			</p>
		</Card>
	);
}
